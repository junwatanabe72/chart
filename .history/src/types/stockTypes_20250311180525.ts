// 株価データの型定義
export interface StockData {
  date: string;
  formattedDate: string;
  code: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnoverValue: number;
  change: string;
  isUp?: boolean;
  // テクニカル指標用のプロパティ
  ma20?: number | null;
  ma50?: number | null;
  ma75?: number | null;
  ma100?: number | null;
  ma200?: number | null;
  bollingerUpper?: number | null;
  bollingerMiddle?: number | null;
  bollingerLower?: number | null;
  // 追加されたテクニカル指標
  rsi?: number | null;
  macdLine?: number | null;
  signalLine?: number | null;
  macdHistogram?: number | null;
}

export interface StockStats {
  high: number;
  low: number;
  avg: string;
}

// テクニカル指標の表示状態
export interface TechnicalIndicators {
  ma20: boolean;
  ma50: boolean;
  ma75: boolean;
  ma100: boolean;
  ma200: boolean;
  bollingerBands: boolean;
  rsi: boolean;
  macd: boolean;
}

// 描画ライン用のインターフェース
export interface DrawingLine {
  id: string;
  type: "trendline" | "horizontalline";
  startIndex: number;
  startPrice: number;
  endIndex: number;
  endPrice: number;
  color: string;
}

// APIレスポンス用の型定義
export interface DailyQuote {
  Date: string;
  Code: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  TurnoverValue: number;
  UpperLimit: string;
  LowerLimit: string;
  AdjustmentFactor: number;
  AdjustmentOpen: number;
  AdjustmentHigh: number;
  AdjustmentLow: number;
  AdjustmentClose: number;
  AdjustmentVolume: number;
}

export interface StockDataResponse {
  daily_quotes: DailyQuote[];
}

// 株式情報のインターフェース
export interface StockInfo {
  Date: string;
  Code: string;
  CompanyName: string;
  CompanyNameEnglish: string;
  Sector17Code: string;
  Sector17CodeName: string;
  Sector33Code: string;
  Sector33CodeName: string;
  ScaleCategory: string;
  MarketCode: string;
  MarketCodeName: string;
}

// チャートスタイルの型
export type ChartStyleType = "candlestick" | "line" | "ohlc" | "area";
