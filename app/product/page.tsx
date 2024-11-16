'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ethers } from 'ethers'
import {
  HandCoinsIcon,
  Loader2,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useState } from 'react'

export default function Product() {
  interface Product {
    id: number
    name: string
    price: number
    quantity: number
    isForSale: boolean
    seller: string
    usdtBalance: number
    ipfsLink: string
    description: string
  }
  const [product, setProduct] = useState<Product | undefined>()
  const [loading, setLoading] = useState(true)
  const [loadingContractData, setLoadingContractData] = useState(false)
  const [loadingApprove, setLoadingApprove] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [loadingBuy, setLoadingBuy] = useState(false)
  const [isNeedAllowance, setIsNeedAllowance] = useState(false)
  const queryParams = useSearchParams()
  const shortAddress = (address: string) => {
    return address.slice(0, 6) + '...' + address.slice(-4)
  }
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
  const contractUsdtAddress = process.env.NEXT_PUBLIC_CONTRACT_USDT!
  const abi = [
    'function getProduct(uint256 _id) public view returns (uint256, string memory, uint256, uint256, bool, address, uint256, string memory, string memory)',
    'function buyProduct(uint256 _id, uint256 _quantity, address _referrer) public',
  ]

  const abiForUsdt = [
    'function allowance(address owner, address spender) public view virtual returns (uint256)',
    'function approve(address spender, uint256 value) public virtual returns (bool)',
    'function balanceOf(address account) public view virtual returns (uint256)',
  ]

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC_URL
  )

  const contractWithProvider = new ethers.Contract(
    contractAddress,
    abi,
    provider
  )

  const { toast } = useToast()

  const isUsdtEnough = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      toast({
        title: 'Wallet not found',
        description: 'Please install a Web3 wallet like MetaMask',
      })
      return false
    }

    try {
      const providerWrite = new ethers.providers.Web3Provider(
        (window as any).ethereum
      )
      const signer = providerWrite.getSigner()
      const contractUsdt = new ethers.Contract(
        contractUsdtAddress,
        abiForUsdt,
        signer
      )
      const balance = await contractUsdt.balanceOf(await signer.getAddress())
      const sum = (product?.price ?? 0) * quantity

      if (Number(ethers.utils.formatEther(balance)) < sum) {
        toast({
          title: 'Not enough USDT',
          description: 'Please add more USDT to your wallet',
        })
        return false
      }
      return true
    } catch (error) {
      console.error('Error checking USDT balance:', error)
      toast({
        title: 'Error',
        description: 'Failed to check USDT balance',
      })
      return false
    }
  }

  const contractData = async () => {
    setLoadingContractData(true)

    const id = queryParams.get('value')

    console.log(id)

    const data = await contractWithProvider.getProduct(Number(id) || 0)
    setProduct((prev) => ({
      ...prev,
      id: data[0].toNumber(),
      name: data[1],
      price: Number(ethers.utils.formatEther(data[2])),
      quantity: data[3].toNumber(),
      isForSale: data[4],
      seller: data[5],
      usdtBalance: Number(ethers.utils.formatEther(data[6])),
      ipfsLink: data[7],
      description: data[8],
    }))
    console.log(product)
    setLoadingContractData(false)
  }

  const handleOnInput = (e: FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement
    input.value = input.value.replace(/[^0-9]/g, '')
    if (Number(input.value) < 1) {
      return
    }
    if (Number(input.value) > (product?.quantity ?? 0)) {
      input.value = (product?.quantity ?? 0).toString()
    }
  }

  const handlePlusMinus = (change: number) => {
    if (quantity + change < 1) {
      return
    }
    if (quantity + change > (product?.quantity ?? 0)) {
      return
    }
    setQuantity((prev) => prev + change)
  }

  const checkIsAllowanceEnough = async () => {
    try {
      setLoadingApprove(true)
      const providerWrite = new ethers.providers.Web3Provider(
        (window as any).ethereum
      )
      const signer = providerWrite.getSigner()
      const contractUsdt = new ethers.Contract(
        contractUsdtAddress,
        abiForUsdt,
        signer
      )
      const allowance = await contractUsdt.allowance(
        signer.getAddress(),
        contractAddress
      )
      const allowanceNumber = Number(ethers.utils.formatEther(allowance))
      const sum = (product?.price ?? 0) * quantity
      console.log(allowanceNumber, sum)
      if (allowanceNumber < sum) {
        setIsNeedAllowance(true)
        setLoadingApprove(false)
        return
      }
      setIsNeedAllowance(false)
      setLoadingApprove(false)
      return
    } catch (error) {
      setLoadingApprove(false)
    }
  }

  const approve = async () => {
    try {
      setLoadingApprove(true)
      const providerWrite = new ethers.providers.Web3Provider(
        (window as any).ethereum
      )
      const signer = providerWrite.getSigner()
      const contractUsdt = new ethers.Contract(
        contractUsdtAddress,
        abiForUsdt,
        signer
      )

      // convert to big number
      const sum = ethers.utils.parseUnits(
        ((product?.price ?? 0) * quantity).toString(),
        18
      )

      const tx = await contractUsdt.approve(contractAddress, sum)
      console.log(tx)
      await tx.wait()
      setLoadingApprove(false)
    } catch (error) {
      setLoadingApprove(false)
    }
  }

  const handleBuy = async () => {
    if (!product) {
      return
    }

    if (!(await isUsdtEnough())) {
      console.log('not enough usdt')
      return
    }

    if (isNeedAllowance) {
      await approve()
      console.log('need approve')
      setLoadingBuy(false)
      return
    }
    try {
      setLoadingBuy(true)
      const providerWrite = new ethers.providers.Web3Provider(
        (window as any).ethereum
      )
      const signer = providerWrite.getSigner()
      const contractWithSigner = new ethers.Contract(
        contractAddress,
        abi,
        signer
      )
      const body = {
        id: product.id,
        quantity: quantity,
        referrer: '0x0000000000000000000000000000000000000000',
      }
      console.log(body)
      const tx = await contractWithSigner.buyProduct(
        body.id,
        body.quantity,
        body.referrer
      )
      await tx.wait()
      setLoadingBuy(false)
      await checkIsAllowanceEnough()
    } catch (error) {
      setLoadingBuy(false)
    }
  }

  const handleCart = () => {
    console.log('cart')
    window.postMessage(
      {
        type: 'FROM_PAGE',
        action: 'sendData',
        data: {
          item: {
            id: product?.id,
            amount: quantity,
            referal: product?.seller,
          },
        },
        _ethayMessage: true,
      },
      '*'
    )
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await contractData()
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      await checkIsAllowanceEnough()
    })()
  }, [loadingContractData])

  useEffect(() => {
    if (loadingApprove || loadingContractData) {
      return
    }
    setLoading(false)
  }, [loadingApprove, loadingContractData])

  return (
    <div className=" flex h-[500px]  justify-center items-center ">
      {product && !loading ? (
        <div className=" p-4 flex flex-col justify-center items-center rounded-lg gap-y-4 w-full max-w-[600px]">
          <div className=" text-xl font-bold text-left w-full">
            Seller: {shortAddress(product?.seller ?? '')}
          </div>
          {product?.ipfsLink && (
            <Image
              src={`https://ipfs.io/ipfs/${product?.ipfsLink}`}
              alt="logo"
              width={500}
              height={200}
              priority
              className="rounded-lg object-contain max-w-[500px] max-h-[200px]"
              placeholder="empty"
            />
          )}

          <div className=" flex flex-col w-full">
            <div className="text-xl font-bold w-full text-left flex justify-between">
              {product?.name}
              <div className=" font-semibold">Price: {product?.price} USDT</div>
            </div>
            <div className="flex w-full text-justify text-slate-500 font-semibold">
              {product?.description}
            </div>
          </div>
          <div className="flex justify-between gap-x-2 w-full">
            <div className="font-semibold">
              Quantity: {product?.quantity} left
            </div>
          </div>
          <div className="flex gap-x-2 w-full">
            <div className="font-semibold w-full">
              <div className="flex items-center gap-x-2 w-full justify-between">
                <div className="flex items-center gap-x-2 ">
                  <Button onClick={() => handlePlusMinus(-1)}>
                    <MinusIcon className="w-4 h-4" />
                  </Button>
                  <Input
                    type="text"
                    placeholder="Enter Text"
                    name="inputName"
                    value={quantity}
                    pattern="^[0-9]+$"
                    onInput={(e) => handleOnInput(e)}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-[150px]"
                  />
                  <Button onClick={() => handlePlusMinus(1)}>
                    <PlusIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="font-semibold text-xl">
                  Sum: {(product?.price ?? 0) * quantity} USDT
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-x-4 w-full">
            <Button
              className="w-full text-lg font-semibold"
              onClick={() => handleBuy()}
            >
              {isNeedAllowance ? (
                loadingApprove ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>Approve</>
                )
              ) : loadingBuy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Buying...
                </>
              ) : (
                <>
                  <HandCoinsIcon className="w-4 h-4" />
                  Buy
                </>
              )}
            </Button>
            <Button className="w-full text-lg font-bold" onClick={handleCart}>
              <ShoppingCartIcon className="w-4 h-4" />
              Cart
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-xl font-bold flex justify-center items-center gap-x-2">
          <Loader2 className="size-6 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  )
}
