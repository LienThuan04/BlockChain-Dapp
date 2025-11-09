import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../../config/blockchain';

const prisma = new PrismaClient();
const web3 = new Web3(process.env.ETH_NODE_URL || 'http://localhost:8545');

export const confirmEthPayment = async (req: Request, res: Response) => {
    try {
        const { productId, transactionHash, blockNumber, ethAmount } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Verify transaction on blockchain
        const transaction = await web3.eth.getTransaction(transactionHash);
        if (!transaction) {
            return res.status(400).json({ message: 'Invalid transaction' });
        }

        // Get current ETH price (you might want to use a price feed service in production)
        const ethPrice = 2000; // Example price in USD

        // Create order with blockchain information
        const order = await prisma.order.create({
            data: {
                userId,
                totalPrice: parseFloat(ethAmount) * ethPrice,
                status: 'COMPLETED',
                paymentMethod: 'ETH',
                txHash: transactionHash,
                ethAmount,
                ethPrice,
                blockNumber,
                orderDetails: {
                    create: {
                        productId,
                        quantity: 1,
                        price: parseFloat(ethAmount) * ethPrice
                    }
                }
            }
        });

        // Update product quantity and sold count
        await prisma.product.update({
            where: { id: productId },
            data: {
                quantity: {
                    decrement: 1
                },
                sold: {
                    increment: 1
                }
            }
        });

        res.json({ 
            success: true, 
            orderId: order.id 
        });
    } catch (error) {
        console.error('Error confirming ETH payment:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};