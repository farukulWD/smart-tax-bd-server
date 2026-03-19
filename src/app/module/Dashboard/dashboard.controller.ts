import { Request, Response } from 'express';

// Dashboard Controller
export const getDashboardData = async (req: Request, res: Response) => {
    try {
        res.status(200).json({
            message: "Dashboard data"
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Error fetching dashboard data" });
    }
};
