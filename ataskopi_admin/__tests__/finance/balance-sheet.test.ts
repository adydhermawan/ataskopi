import { getBalanceSheet } from '@/actions/reports';
import { db as prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    db: {
        outlet: {
            findUnique: jest.fn(),
        },
        rawMaterial: {
            findMany: jest.fn(),
        },
        asset: {
            findMany: jest.fn(),
        },
        dailyRealRevenue: {
            findMany: jest.fn(),
        },
        stockOpname: {
            findMany: jest.fn(),
        },
        expense: {
            findMany: jest.fn(),
        },
        inventoryPurchase: {
            findMany: jest.fn(),
        },
    },
}));

jest.mock('@/lib/auth-utils', () => ({
    requirePermission: jest.fn(),
}));

describe('Balance Sheet Module - Financial Calculations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Scenario 1: Should display identical Total Aktiva and Total Pasiva (Difference = Rp 0)', async () => {
        // Mock data matching the PRD Scenario 1:
        // Revenue: Rp 1,013,000
        // COGS: Rp 456,050
        // OpEx: Rp 124,000
        // Asset (CapEx): Rp 20,000
        
        // Let's set up Purchases to be Rp 500,000, which means:
        // Ending inventory = Purchases - COGS = 500,000 - 456,050 = Rp 43,950
        const mockOutletId = 'test-outlet-id';
        const mockAsOfDate = new Date('2026-06-03T23:59:59Z');

        (prisma.outlet.findUnique as jest.Mock).mockResolvedValue({
            id: mockOutletId,
            name: 'Atas Kopi Test',
            modalAwal: 0, // No initial capital input
        });

        // Current Inventory Stock value should represent ending inventory
        (prisma.rawMaterial.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'raw-1',
                name: 'Mock Coffee Beans',
                unit: 'g',
                currentStock: 1,
                averageCost: 43950, // Ending inventory = 43,950
            }
        ]);

        // Mock CapEx/Asset purchased: Rp 20,000
        (prisma.asset.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'asset-1',
                name: 'Mock Blender',
                purchasePrice: 20000,
                purchaseDate: new Date('2026-06-01T00:00:00Z'),
                usefulLifeMonths: 12,
                monthlyDepreciation: 0, // Keep simple without depreciation
                status: 'ACTIVE',
            }
        ]);

        // Revenue: Rp 1,013,000
        (prisma.dailyRealRevenue.findMany as jest.Mock).mockResolvedValue([
            { amount: 1013000 }
        ]);

        // COGS: Rp 456,050
        (prisma.stockOpname.findMany as jest.Mock).mockResolvedValue([
            { cogsAmount: 456050 }
        ]);

        // OpEx: Rp 124,000
        (prisma.expense.findMany as jest.Mock).mockResolvedValue([
            { amount: 124000 }
        ]);

        // Purchases: Rp 500,000
        (prisma.inventoryPurchase.findMany as jest.Mock).mockResolvedValue([
            { totalAmount: 500000 }
        ]);

        const result = await getBalanceSheet(mockOutletId, mockAsOfDate);

        // Assert ending cash balance:
        // cash = modalAwal + Revenue - (Purchases + OpEx + AssetPrice)
        // cash = 0 + 1,013,000 - (500,000 + 124,000 + 20,000)
        // cash = 1,013,000 - 644,000 = 369,000
        expect(result.cash).toBe(369000);

        // Assert inventory: Rp 43,950
        expect(result.inventory.totalValue).toBe(43950);

        // Assert fixed assets Net Book Value: Rp 20,000
        expect(result.fixedAssets.totalValue).toBe(20000);

        // Total Assets = cash + inventory + fixed assets
        // Total Assets = 369,000 + 43,950 + 20,000 = 432,950
        expect(result.totalAssets).toBe(432950);

        // Retained Earnings = Revenue - COGS - OpEx - Depreciation
        // Retained Earnings = 1,013,000 - 456,050 - 124,000 - 0 = 432,950
        expect(result.equity.retainedEarnings).toBe(432950);
        expect(result.equity.initialCapital).toBe(0);

        // Total Equity = initialCapital + retainedEarnings = 432,950
        const totalEquity = result.equity.initialCapital + result.equity.retainedEarnings;
        expect(totalEquity).toBe(432950);

        // SAMA PERSIS (Selisih = Rp 0)
        expect(result.totalAssets).toBe(totalEquity);
    });

    it('Scenario 2: Handling Modal Awal Kosong', async () => {
        // GIVEN: Pengguna baru mendaftarkan outlet di AtasKopi dan belum memasukkan modal awal di pengaturan.
        const mockOutletId = 'test-new-outlet';
        
        (prisma.outlet.findUnique as jest.Mock).mockResolvedValue({
            id: mockOutletId,
            name: 'Outlet Baru',
            modalAwal: 0, // Defaults to 0 or null, we default to 0 on getBalanceSheet
        });
        (prisma.rawMaterial.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.asset.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.dailyRealRevenue.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.stockOpname.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.inventoryPurchase.findMany as jest.Mock).mockResolvedValue([]);

        const result = await getBalanceSheet(mockOutletId, new Date());

        // THEN: Baris "Modal Awal / Investasi Kas" harus menampilkan angka Rp 0, bukan Rp 10.000.000.
        expect(result.equity.initialCapital).toBe(0);
        expect(result.totalAssets).toBe(0);
    });

    it('Should calculate balance sheet correctly when there is non-zero initialCapital', async () => {
        const mockOutletId = 'test-outlet-capital';
        
        (prisma.outlet.findUnique as jest.Mock).mockResolvedValue({
            id: mockOutletId,
            name: 'Outlet Ber-Modal',
            modalAwal: 15000000, // Rp 15,000,000
        });
        (prisma.rawMaterial.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.asset.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.dailyRealRevenue.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.stockOpname.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.inventoryPurchase.findMany as jest.Mock).mockResolvedValue([]);

        const result = await getBalanceSheet(mockOutletId, new Date());

        expect(result.equity.initialCapital).toBe(15000000);
        expect(result.cash).toBe(15000000);
        expect(result.totalAssets).toBe(15000000);
        
        const totalEquity = result.equity.initialCapital + result.equity.retainedEarnings;
        expect(result.totalAssets).toBe(totalEquity);
    });
});
