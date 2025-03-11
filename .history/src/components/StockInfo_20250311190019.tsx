import React, { useState, useEffect } from "react";

interface CompanyInfo {
  Code: string;
  CompanyName: string;
  CompanyNameEnglish: string;
  Sector33CodeName: string;
  MarketCodeName: string;
}

interface FinancialStatement {
  DisclosedDate: string;
  TypeOfDocument: string;
  TypeOfCurrentPeriod: string;
  NetSales: string;
  OperatingProfit: string;
  OrdinaryProfit: string;
  Profit: string;
  EarningsPerShare: string;
}

const StockInfo: React.FC = () => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [financialData, setFinancialData] = useState<FinancialStatement[]>([]);
  const [showFinancials, setShowFinancials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        setLoading(true);
        // 会社情報を取得
        const response = await fetch("/specifiedStockList.json");
        if (!response.ok) {
          throw new Error("会社情報の取得に失敗しました");
        }
        const data = await response.json();

        // データ構造をログに出力して確認
        console.log("JSON data structure:", data);

        // データ構造に応じて適切に処理
        let company = null;

        if (Array.isArray(data)) {
          // データが配列の場合
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          company = data.find((stock: any) => stock.Code === "130A0");
        } else if (data.stocks && Array.isArray(data.stocks)) {
          // data.stocksが配列の場合
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          company = data.stocks.find((stock: any) => stock.Code === "130A0");
        } else {
          // その他の構造の場合 - オブジェクトのキーを探索
          const allStocks = Object.values(data).flat();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          company = allStocks.find((stock: any) => stock.Code === "130A0");
        }

        if (company) {
          setCompanyInfo(company);
        } else {
          throw new Error("指定された会社が見つかりません");
        }

        // 財務データを取得
        const financialResponse = await fetch(
          "/specifiedStockFinancialData/130A0.json"
        );
        if (!financialResponse.ok) {
          throw new Error("財務データの取得に失敗しました");
        }
        const financialData = await financialResponse.json();

        // 財務データを日付順にソート
        const sortedStatements = financialData.statements.sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) =>
            new Date(b.DisclosedDate).getTime() -
            new Date(a.DisclosedDate).getTime()
        );

        setFinancialData(sortedStatements);
        setError(null);
      } catch (err) {
        console.error("データ取得エラー:", err);
        setError(
          err instanceof Error ? err.message : "データの取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyInfo();
  }, []);

  // 金額をフォーマットする関数
  const formatAmount = (amount: string) => {
    if (!amount) return "-";
    const num = parseInt(amount, 10);
    if (isNaN(num)) return "-";

    // 百万円単位で表示
    return `${(num / 1000000).toFixed(2)}百万円`;
  };

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 財務書類の種類を日本語に変換
  const getDocumentTypeJP = (type: string) => {
    const types: { [key: string]: string } = {
      FYFinancialStatements_NonConsolidated_JP: "通期決算",
      "1QFinancialStatements_NonConsolidated_JP": "第1四半期決算",
      "2QFinancialStatements_NonConsolidated_JP": "第2四半期決算",
      "3QFinancialStatements_NonConsolidated_JP": "第3四半期決算",
      EarnForecastRevision: "業績予想修正",
    };
    return types[type] || type;
  };

  if (loading) {
    return <div className="p-4 text-center">データを読み込み中...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      {companyInfo && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{companyInfo.CompanyName}</h2>
          <p className="text-gray-600 mb-1">{companyInfo.CompanyNameEnglish}</p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">証券コード</p>
              <p className="font-medium">{companyInfo.Code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">業種</p>
              <p className="font-medium">{companyInfo.Sector33CodeName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">市場</p>
              <p className="font-medium">{companyInfo.MarketCodeName}</p>
            </div>
          </div>

          <button
            onClick={() => setShowFinancials(!showFinancials)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {showFinancials ? "業績を隠す" : "業績を表示"}
          </button>
        </div>
      )}

      {showFinancials && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">業績推移</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-3 border text-left">開示日</th>
                  <th className="py-2 px-3 border text-left">種類</th>
                  <th className="py-2 px-3 border text-right">売上高</th>
                  <th className="py-2 px-3 border text-right">営業利益</th>
                  <th className="py-2 px-3 border text-right">経常利益</th>
                  <th className="py-2 px-3 border text-right">当期純利益</th>
                  <th className="py-2 px-3 border text-right">EPS</th>
                </tr>
              </thead>
              <tbody>
                {financialData.map((statement, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="py-2 px-3 border">
                      {formatDate(statement.DisclosedDate)}
                    </td>
                    <td className="py-2 px-3 border">
                      {getDocumentTypeJP(statement.TypeOfDocument)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {formatAmount(statement.NetSales)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {formatAmount(statement.OperatingProfit)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {formatAmount(statement.OrdinaryProfit)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {formatAmount(statement.Profit)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {statement.EarningsPerShare || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInfo;
