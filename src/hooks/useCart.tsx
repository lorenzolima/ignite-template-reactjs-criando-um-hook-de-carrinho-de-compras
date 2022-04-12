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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; /* here we are respecting the imutability law of react */

      // This function below will retorn false or true
      const productExists = updatedCart.find(product => product.id === productId);
      const stockItem = await api.get(`/stock/${productId}`)
      const amountStockItem =  stockItem.data.amount;
      const cartItemAmount = (productExists) ? productExists.amount : 0;
      const addCartItemAmount = cartItemAmount + 1

      if (addCartItemAmount > amountStockItem) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      if (productExists) {
        productExists.amount = addCartItemAmount;
      }
      else {
        const product = await api.get(`/products/${productId}`)

        // We are adding to the cart the new amount, because when we bring the product from the server it dont have the variable 'amount'
        const newProduct = {
          ...product.data, amount: 1
        }

        updatedCart.push(newProduct);
      }
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCartRm = [...cart]; /* estamos passando o conteúdo existente para a variavel preservando a imutabilidade */
      const productExistId = updatedCartRm.findIndex(product => product.id === productId);
      
      if (productExistId >= 0) {
        updatedCartRm.splice(productExistId, 1);
        setCart(updatedCartRm)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCartRm));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
    }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const resStock = await api.get(`/stock/${productId}`)
      const stockAmount = resStock.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCartUp = [...cart]
      const productExist = updatedCartUp.find(product => product.id === productId);

      if (productExist) {
          productExist.amount = amount
          setCart(updatedCartUp)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCartUp));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

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
