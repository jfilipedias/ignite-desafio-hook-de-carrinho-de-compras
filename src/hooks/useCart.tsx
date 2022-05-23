import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storedCart = localStorage.getItem('@RocketShoes:cart');

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find((product) => product.id === productId);

      if (!product) {
        const productsResponse = await api.get(`/products/${productId}`);
        const product = {
          ...productsResponse.data,
          amount: 1
        } as Product;

        const newCart = [...cart, product];
        updateCart(newCart);
      } else {
        await updateProductAmount({
          productId,
          amount: product.amount + 1
        });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart =
        cart.filter((product) => product.id !== productId);

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productStock = await getProductStock(productId);

      if (productStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        throw Error();
      }

      const product =
        cart.find((product) => product.id === productId) as Product;

      product.amount = amount;

      updateCart([...cart]);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  async function getProductStock(productId: number) {
    const stockResponse = await api.get(`/stock/${productId}`);
    return stockResponse.data as Stock;
  }

  function updateCart(cart: Product[]) {
    setCart(cart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
