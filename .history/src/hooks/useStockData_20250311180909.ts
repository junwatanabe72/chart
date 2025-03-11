import { useState, useEffect } from "react";
import {
  StockData,
  StockDataResponse,
  TechnicalIndicators,
} from "../types/stockTypes";
import {
  formatDate,
  calculateSMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
} from "../utils/technicalIndicators";

interface UseStockDataReturn {
  stockData: StockData[];
  stockDataWithIndicators: StockData[];
  visibleData: StockData[];
  loading: boolean;
  error: string | null;
  setXAxisDomain: (domain: [number, number] | null) => void;
  updateVisibleData: (start: number, end: number) => void;
  xAxisDomain: [number, number] | null;
  indicators: TechnicalIndicators;
  toggleIndicator: (indicator: keyof TechnicalIndicators) => void;
  bollingerPeriod: number;
  setBollingerPeriod: (period: number) => void;
  bollingerStdDev: number;
  setBollingerStdDev: (stdDev: number) => void;
  rsiPeriod: number;
  setRsiPeriod: (period: number) => void;
  macdParams: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
  setMacdParams: (params: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  }) => void;
}

export const useStockData = (
  jsonPath: string = "specifiedStock/130A0.json"
): UseStockDataReturn => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [stockDataWithIndicators, setStockDataWithIndicators] = useState<
    StockData[]
  >([]);
  const [visibleData, setVisibleData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [xAxisDomain, setXAxisDomain] = useState<[number, number] | null>(null);

  // テクニカル指標の表示状態
  const [indicators, setIndicators] = useState<TechnicalIndicators>({
    ma20: false,
    ma50: false,
    ma75: false,
    ma100: false,
    ma200: false,
    bollingerBands: false,
    rsi: false,
    macd: false,
  });

  // ボリンジャーバンドの設定
  const [bollingerPeriod, setBollingerPeriod] = useState<number>(20);
  const [bollingerStdDev, setBollingerStdDev] = useState<number>(2);

  // RSIとMACDの設定
  const [rsiPeriod, setRsiPeriod] = useState<number>(14);
  const [macdParams, setMacdParams] = useState({
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  });

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(jsonPath);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const jsonData: StockDataResponse = await response.json();

        // JSONデータを処理
        const processedData: StockData[] = jsonData.daily_quotes.map((item) => {
          const percentChange = (
            ((item.Close - item.Open) / item.Open) *
            100
          ).toFixed(2);

          return {
            date: item.Date,
            formattedDate: formatDate(item.Date),
            code: item.Code,
            open: item.Open,
            high: item.High,
            low: item.Low,
            close: item.Close,
            volume: item.Volume,
            turnoverValue: item.TurnoverValue,
            change: percentChange,
            isUp: item.Close >= item.Open,
          };
        });

        // 日付でソート
        const sortedData = processedData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        setStockData(sortedData);
        setVisibleData(sortedData); // 初期表示は全データ
        setError(null);
      } catch (err) {
        console.error("Error fetching stock data:", err);
        setError(
          "株価データの読み込みに失敗しました。JSONファイルが正しく配置されているか確認してください。"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jsonPath]);

  // テクニカル指標を計算
  useEffect(() => {
    if (stockData.length > 0) {
      // データに指標を追加
      const dataWithIndicators = [...stockData];

      // 移動平均線を計算
      const ma20 = calculateSMA(stockData, 20);
      const ma50 = calculateSMA(stockData, 50);
      const ma75 = calculateSMA(stockData, 75);
      const ma100 = calculateSMA(stockData, 100);
      const ma200 = calculateSMA(stockData, 200);

      // ボリンジャーバンドを計算
      const { upper, middle, lower } = calculateBollingerBands(
        stockData,
        bollingerPeriod,
        bollingerStdDev
      );

      // RSIを計算
      const rsiValues = calculateRSI(stockData, rsiPeriod);

      // MACDを計算
      const { macdLine, signalLine, histogram } = calculateMACD(
        stockData,
        macdParams.fastPeriod,
        macdParams.slowPeriod,
        macdParams.signalPeriod
      );

      // データに指標を追加
      dataWithIndicators.forEach((item, i) => {
        item.ma20 = ma20[i];
        item.ma50 = ma50[i];
        item.ma75 = ma75[i];
        item.ma100 = ma100[i];
        item.ma200 = ma200[i];
        item.bollingerUpper = upper[i];
        item.bollingerMiddle = middle[i];
        item.bollingerLower = lower[i];
        item.rsi = rsiValues[i];
        item.macdLine = macdLine[i];
        item.signalLine = signalLine[i];
        item.macdHistogram = histogram[i];
      });

      setStockDataWithIndicators(dataWithIndicators);

      // 可視データも更新
      if (xAxisDomain) {
        const startIndex = Math.floor(xAxisDomain[0]);
        const endIndex = Math.ceil(xAxisDomain[1]);
        setVisibleData(dataWithIndicators.slice(startIndex, endIndex + 1));
      } else {
        setVisibleData(dataWithIndicators);
      }
    }
  }, [
    stockData,
    bollingerPeriod,
    bollingerStdDev,
    rsiPeriod,
    macdParams,
    xAxisDomain,
  ]);

  // 表示データを更新
  const updateVisibleData = (start: number, end: number) => {
    const startIndex = Math.floor(start);
    const endIndex = Math.ceil(end);
    setVisibleData(stockDataWithIndicators.slice(startIndex, endIndex + 1));
  };

  // テクニカル指標の表示切替
  const toggleIndicator = (indicator: keyof TechnicalIndicators) => {
    setIndicators((prev) => ({
      ...prev,
      [indicator]: !prev[indicator],
    }));
  };

  return {
    stockData,
    stockDataWithIndicators,
    visibleData,
    loading,
    error,
    setXAxisDomain,
    updateVisibleData,
    xAxisDomain,
    indicators,
    toggleIndicator,
    bollingerPeriod,
    setBollingerPeriod,
    bollingerStdDev,
    setBollingerStdDev,
    rsiPeriod,
    setRsiPeriod,
    macdParams,
    setMacdParams,
  };
};
