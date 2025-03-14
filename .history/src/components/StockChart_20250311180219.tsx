import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Brush,
  Line,
  Legend,
  Area,
  ReferenceLine,
} from "recharts";

// Define interfaces for stock data
interface StockData {
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

interface StockStats {
  high: number;
  low: number;
  avg: string;
}

// テクニカル指標の表示状態
interface TechnicalIndicators {
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
interface DrawingLine {
  id: string;
  type: "trendline" | "horizontalline";
  startIndex: number;
  startPrice: number;
  endIndex: number;
  endPrice: number;
  color: string;
}

// Interface for JSON data
interface DailyQuote {
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

interface StockDataResponse {
  daily_quotes: DailyQuote[];
}
// 株式情報のインターフェース
interface StockInfo {
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

const StockChart: React.FC = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [stockDataWithIndicators, setStockDataWithIndicators] = useState<
    StockData[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chart interaction states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [visibleData, setVisibleData] = useState<StockData[]>([]);
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

  // クロスヘアーの状態
  const [crosshairValues, setCrosshairValues] = useState<{
    x: number;
    y: number;
    xValue: string;
    yValue: number;
  } | null>(null);
  const [showCrosshair, setShowCrosshair] = useState<boolean>(true);

  // 描画ツールの状態
  const [drawingMode, setDrawingMode] = useState<
    "trendline" | "horizontalline" | null
  >(null);
  const [drawingLines, setDrawingLines] = useState<DrawingLine[]>([]);
  const [drawingStart, setDrawingStart] = useState<{
    index: number;
    price: number;
  } | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<{
    index: number;
    price: number;
  } | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [lineColors] = useState<string[]>([
    "#FF5722",
    "#2196F3",
    "#4CAF50",
    "#9C27B0",
    "#E91E63",
  ]);

  // チャートスタイルの状態
  type ChartStyleType = "candlestick" | "line" | "ohlc" | "area";
  const [chartStyle, setChartStyle] = useState<ChartStyleType>("candlestick");

  const chartRef = useRef<HTMLDivElement>(null);
  // const setChartContainerRef = useCallback((node: HTMLDivElement) => {
  //   chartContainerRef.current = node;
  // }, []);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] =
    useState<boolean>(false);

  // 単純移動平均（SMA）を計算する関数
  const calculateSMA = (
    data: StockData[],
    period: number
  ): (number | null)[] => {
    const result: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        // 期間に満たない場合はnullを設定
        result.push(null);
      } else {
        // 期間分のデータを取得して平均を計算
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        result.push(sum / period);
      }
    }

    return result;
  };

  // ボリンジャーバンドを計算する関数
  const calculateBollingerBands = (
    data: StockData[],
    period: number = 20,
    stdDev: number = 2
  ): {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  } => {
    const middle = calculateSMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
      } else {
        // 標準偏差を計算
        let sum = 0;
        for (let j = 0; j < period; j++) {
          const middleValue = middle[i] as number;
          sum += Math.pow(data[i - j].close - middleValue, 2);
        }
        const std = Math.sqrt(sum / period);

        upper.push((middle[i] as number) + stdDev * std);
        lower.push((middle[i] as number) - stdDev * std);
      }
    }

    return { upper, middle, lower };
  };

  // RSIを計算する関数
  const calculateRSI = (
    data: StockData[],
    period: number = 14
  ): (number | null)[] => {
    const rsi: (number | null)[] = [];

    // 最低でもperiod + 1データポイントが必要
    if (data.length <= period) {
      return data.map(() => null);
    }

    // 価格変化を計算
    const changes: number[] = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }

    // 最初のperiod要素に対してRSIを計算できない
    for (let i = 0; i < period; i++) {
      rsi.push(null);
    }

    // 最初のRS値を計算
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) {
        avgGain += changes[i];
      } else {
        avgLoss += Math.abs(changes[i]);
      }
    }

    avgGain /= period;
    avgLoss /= period;

    // 最初のRSIを計算
    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // ゼロ除算を防ぐ
    let currentRsi = 100 - 100 / (1 + rs);
    rsi.push(currentRsi);

    // 残りのRSI値を計算
    for (let i = period; i < changes.length; i++) {
      const change = changes[i];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      // スムーズ平均を使用
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
      currentRsi = 100 - 100 / (1 + rs);

      rsi.push(currentRsi);
    }

    return rsi;
  };

  // MACDを計算する関数
  const calculateMACD = (
    data: StockData[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): {
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
  } => {
    // EMAを計算
    const calculateEMA = (
      prices: number[],
      period: number
    ): (number | null)[] => {
      const ema: (number | null)[] = [];
      const multiplier = 2 / (period + 1);

      // 最初のEMAはSMA
      let sum = 0;
      for (let i = 0; i < period; i++) {
        sum += prices[i];
        ema.push(null);
      }

      ema[period - 1] = sum / period;

      // 残りのEMAを計算
      for (let i = period; i < prices.length; i++) {
        ema.push(
          (prices[i] - (ema[i - 1] as number)) * multiplier +
            (ema[i - 1] as number)
        );
      }

      return ema;
    };

    const closePrices = data.map((d) => d.close);

    // 高速と低速のEMAを計算
    const fastEMA = calculateEMA(closePrices, fastPeriod);
    const slowEMA = calculateEMA(closePrices, slowPeriod);

    // MACDライン（高速EMA - 低速EMA）を計算
    const macdLine: (number | null)[] = [];

    for (let i = 0; i < closePrices.length; i++) {
      if (i < slowPeriod - 1) {
        macdLine.push(null);
      } else {
        const fastValue = fastEMA[i];
        const slowValue = slowEMA[i];

        if (fastValue !== null && slowValue !== null) {
          macdLine.push(fastValue - slowValue);
        } else {
          macdLine.push(null);
        }
      }
    }

    // シグナルライン（MACDラインのEMA）を計算
    const signalLine: (number | null)[] = [];
    const macdLineValues: number[] = [];

    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] !== null) {
        macdLineValues.push(macdLine[i] as number);
      }
    }

    const signalEMA = calculateEMA(macdLineValues, signalPeriod);

    // シグナルラインを元のデータと整列
    let signalIndex = 0;
    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null) {
        signalLine.push(null);
      } else {
        if (signalIndex < signalPeriod - 1) {
          signalLine.push(null);
        } else {
          signalLine.push(signalEMA[signalIndex - (signalPeriod - 1)]);
        }
        signalIndex++;
      }
    }

    // ヒストグラム（MACDライン - シグナルライン）を計算
    const histogram: (number | null)[] = [];

    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null || signalLine[i] === null) {
        histogram.push(null);
      } else {
        histogram.push((macdLine[i] as number) - (signalLine[i] as number));
      }
    }

    return { macdLine, signalLine, histogram };
  };

  useEffect(() => {
    // Fetch data from JSON file in public directory
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch JSON from public directory
        const response = await fetch("specifiedStock/130A0.json");

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const jsonData: StockDataResponse = await response.json();

        // Process the data from JSON format to our StockData format
        const processedData: StockData[] = jsonData.daily_quotes.map((item) => {
          // Calculate percent change
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

        // Sort by date
        const sortedData = processedData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        setStockData(sortedData);
        setVisibleData(sortedData); // Initially show all data
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
  }, []);

  // テクニカル指標を計算して適用
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
  }, [stockData, bollingerPeriod, bollingerStdDev, rsiPeriod, macdParams]);

  // Format date for display
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  }

  // クロスヘアー表示切替関数
  const toggleCrosshair = () => {
    setShowCrosshair(!showCrosshair);
  };

  // Handle zoom by mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (stockData.length === 0) return;

    // Get current visible range
    const start = xAxisDomain ? xAxisDomain[0] : 0;
    const end = xAxisDomain ? xAxisDomain[1] : stockData.length - 1;
    const range = end - start;

    // Calculate new range based on zoom direction
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9; // Zoom out or in
    const newRange = Math.max(
      5,
      Math.min(stockData.length, range * zoomFactor)
    );

    // Calculate the center point of the current view as a ratio
    const center = e.nativeEvent.offsetX / e.currentTarget.clientWidth;

    // Calculate new start and end based on the center point
    let newStart = Math.max(0, start + (range - newRange) * center);
    const newEnd = Math.min(stockData.length - 1, newStart + newRange);

    // Adjust start if end is at maximum
    if (newEnd === stockData.length - 1) {
      newStart = Math.max(0, newEnd - newRange);
    }

    setXAxisDomain([newStart, newEnd]);
    updateVisibleData(newStart, newEnd);
  };

  // Handle pan by dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode) {
      // チャートの寸法と座標を取得
      const chartRect = chartRef.current?.getBoundingClientRect();
      if (!chartRect) return;

      // チャート内の相対位置を計算
      const relativeX = e.clientX - chartRect.left;
      const relativeY = e.clientY - chartRect.top;

      // データ座標に変換
      const chartWidth = chartRect.width;
      const chartHeight = chartRect.height;

      const visibleStartIndex = xAxisDomain ? Math.floor(xAxisDomain[0]) : 0;
      const visibleEndIndex = xAxisDomain
        ? Math.ceil(xAxisDomain[1])
        : stockData.length - 1;
      const visibleRange = visibleEndIndex - visibleStartIndex;

      const indexPosition =
        visibleStartIndex + (relativeX / chartWidth) * visibleRange;
      const indexRounded = Math.round(indexPosition);

      // Y位置から価格を計算（反転）
      const [minPrice, maxPrice] = domain;
      const priceRange = maxPrice - minPrice;
      const price = maxPrice - (relativeY / chartHeight) * priceRange;

      // 描画開始点を設定
      setDrawingStart({ index: indexRounded, price });
      setDrawingEnd(null);
    } else {
      // 元のパン機能
      setIsDragging(true);
      setDragStartX(e.clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode && drawingStart) {
      // チャートの寸法と座標を取得
      const chartRect = chartRef.current?.getBoundingClientRect();
      if (!chartRect) return;

      // チャート内の相対位置を計算
      const relativeX = e.clientX - chartRect.left;
      const relativeY = e.clientY - chartRect.top;

      // データ座標に変換
      const chartWidth = chartRect.width;
      const chartHeight = chartRect.height;

      const visibleStartIndex = xAxisDomain ? Math.floor(xAxisDomain[0]) : 0;
      const visibleEndIndex = xAxisDomain
        ? Math.ceil(xAxisDomain[1])
        : stockData.length - 1;
      const visibleRange = visibleEndIndex - visibleStartIndex;

      const indexPosition =
        visibleStartIndex + (relativeX / chartWidth) * visibleRange;
      const indexRounded = Math.round(indexPosition);

      // Y位置から価格を計算（反転）
      const [minPrice, maxPrice] = domain;
      const priceRange = maxPrice - minPrice;
      const price = maxPrice - (relativeY / chartHeight) * priceRange;

      // 描画終了点を更新
      if (drawingMode === "horizontalline") {
        // 水平線の場合、両方の点で同じ価格を保持
        setDrawingEnd({ index: indexRounded, price: drawingStart.price });
      } else {
        setDrawingEnd({ index: indexRounded, price });
      }
    } else if (!isDragging || dragStartX === null || !xAxisDomain) return;
    else {
      // Original pan functionality
      const chartWidth = chartRef.current?.clientWidth || 1;
      const moveRatio = (dragStartX - e.clientX) / chartWidth;
      const domainRange = xAxisDomain[1] - xAxisDomain[0];
      const moveDelta = moveRatio * domainRange;

      // Calculate new domain
      let newStart = Math.max(0, xAxisDomain[0] + moveDelta);
      let newEnd = Math.min(stockData.length - 1, xAxisDomain[1] + moveDelta);

      // Keep the domain range constant
      if (newStart === 0) {
        newEnd = Math.min(stockData.length - 1, newStart + domainRange);
      } else if (newEnd === stockData.length - 1) {
        newStart = Math.max(0, newEnd - domainRange);
      }

      setXAxisDomain([newStart, newEnd]);
      updateVisibleData(newStart, newEnd);
      setDragStartX(e.clientX);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode && drawingStart && drawingEnd) {
      // 新しい描画線を追加
      const newLine: DrawingLine = {
        id: `line-${Date.now()}`,
        type: drawingMode,
        startIndex: drawingStart.index,
        startPrice: drawingStart.price,
        endIndex: drawingEnd.index,
        endPrice: drawingEnd.price,
        color: lineColors[drawingLines.length % lineColors.length],
      };

      setDrawingLines([...drawingLines, newLine]);

      // 描画点をリセット
      setDrawingStart(null);
      setDrawingEnd(null);
    } else {
      // 元のパン機能終了
      setIsDragging(false);
      setDragStartX(null);
    }
  };

  // Update visible data based on domain
  const updateVisibleData = (start: number, end: number) => {
    const startIndex = Math.floor(start);
    const endIndex = Math.ceil(end);
    setVisibleData(stockDataWithIndicators.slice(startIndex, endIndex + 1));
  };

  // Reset zoom to show all data
  const resetZoom = () => {
    setXAxisDomain(null);
    setVisibleData(stockDataWithIndicators);
  };

  // 描画線を削除する関数
  const deleteLine = (id: string) => {
    setDrawingLines(drawingLines.filter((line) => line.id !== id));
    setSelectedLine(null);
  };

  // テクニカル指標の表示切替
  const toggleIndicator = (indicator: keyof TechnicalIndicators) => {
    setIndicators((prev) => ({
      ...prev,
      [indicator]: !prev[indicator],
    }));
  };

  // Add custom renderer for the candlestick chart
  const renderCandlestick = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const { open, close, high, low } = payload;

    const isUp = close >= open;
    const color = isUp ? "#22c55e" : "#ef4444";

    // Calculate the body height and position
    const maxHeight = height;

    // Get the price range for proper scaling
    const allPrices = visibleData.flatMap((d) => [d.high, d.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;

    // Calculate the y-positions for the candlestick parts
    const highY = y + maxHeight * (1 - (high - minPrice) / priceRange);
    const lowY = y + maxHeight * (1 - (low - minPrice) / priceRange);
    const openY = y + maxHeight * (1 - (open - minPrice) / priceRange);
    const closeY = y + maxHeight * (1 - (close - minPrice) / priceRange);

    // Calculate body positions
    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = bodyBottom - bodyTop;

    // Calculate optimal candle width based on visible data count
    const zoomLevel = stockData.length / visibleData.length;
    const candleWidth = Math.max(1, Math.min(15, width * 0.7));

    // Draw the candlestick
    return (
      <g key={`candlestick-${index}`}>
        {/* Draw the vertical line (wick) */}
        <line
          x1={x + width / 2}
          y1={highY}
          x2={x + width / 2}
          y2={lowY}
          stroke={color}
          strokeWidth={Math.max(1, Math.min(2, zoomLevel / 10))}
        />

        {/* Draw the body */}
        <rect
          x={x + (width - candleWidth) / 2}
          y={bodyTop}
          width={candleWidth}
          height={Math.max(1, bodyHeight)}
          fill={color}
        />
      </g>
    );
  };

  // OHLCレンダラー
  const renderOHLC = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const { open, close, high, low } = payload;

    const color = close >= open ? "#22c55e" : "#ef4444";

    // 見える価格範囲に基づいて位置を計算
    const allPrices = visibleData.flatMap((d) => [d.high, d.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;

    // ライン位置を計算
    const highY = y + height * (1 - (high - minPrice) / priceRange);
    const lowY = y + height * (1 - (low - minPrice) / priceRange);
    const openY = y + height * (1 - (open - minPrice) / priceRange);
    const closeY = y + height * (1 - (close - minPrice) / priceRange);

    // 表示データ数に基づいて最適なティック幅を計算
    const zoomLevel = stockData.length / visibleData.length;
    const tickWidth = Math.max(1, Math.min(10, width * 0.4));

    return (
      <g key={`ohlc-${index}`}>
        {/* 高値から安値への垂直線 */}
        <line
          x1={x + width / 2}
          y1={highY}
          x2={x + width / 2}
          y2={lowY}
          stroke={color}
          strokeWidth={Math.max(1, Math.min(2, zoomLevel / 10))}
        />

        {/* 始値ティック（左） */}
        <line
          x1={x + width / 2 - tickWidth}
          y1={openY}
          x2={x + width / 2}
          y2={openY}
          stroke={color}
          strokeWidth={Math.max(1, Math.min(2, zoomLevel / 10))}
        />

        {/* 終値ティック（右） */}
        <line
          x1={x + width / 2}
          y1={closeY}
          x2={x + width / 2 + tickWidth}
          y2={closeY}
          stroke={color}
          strokeWidth={Math.max(1, Math.min(2, zoomLevel / 10))}
        />
      </g>
    );
  };

  // カスタムカーソル（クロスヘアー）
  const CustomCursor = (props: any) => {
    const { points, width, height, stroke } = props;
    const { x, y } = points[0];

    if (!showCrosshair || !crosshairValues) return null;

    return (
      <g>
        {/* 垂直線 */}
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#666"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* 水平線 */}
        <line
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="#666"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Y軸値の表示 */}
        <rect
          x={width - 70}
          y={y - 10}
          width={70}
          height={20}
          fill="rgba(0, 0, 0, 0.7)"
          rx={3}
        />
        <text
          x={width - 35}
          y={y + 5}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
        >
          {crosshairValues.yValue.toFixed(2)}
        </text>

        {/* X軸値の表示 */}
        <rect
          x={x - 40}
          y={height - 20}
          width={80}
          height={20}
          fill="rgba(0, 0, 0, 0.7)"
          rx={3}
        />
        <text
          x={x}
          y={height - 5}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
        >
          {crosshairValues.xValue}
        </text>
      </g>
    );
  };

  // 描画線のレンダリング
  const renderDrawingLines = () => {
    const allLines = [...drawingLines];

    // 描画モード中なら、現在の描画線も追加
    if (drawingMode && drawingStart && drawingEnd) {
      allLines.push({
        id: "current-drawing",
        type: drawingMode,
        startIndex: drawingStart.index,
        startPrice: drawingStart.price,
        endIndex: drawingEnd.index,
        endPrice: drawingEnd.price,
        color: "#FF9800",
      });
    }

    return allLines.map((line) => {
      // インデックスをX座標に変換
      const startX =
        ((line.startIndex - (xAxisDomain ? xAxisDomain[0] : 0)) /
          ((xAxisDomain ? xAxisDomain[1] : stockData.length - 1) -
            (xAxisDomain ? xAxisDomain[0] : 0))) *
        100;
      const endX =
        ((line.endIndex - (xAxisDomain ? xAxisDomain[0] : 0)) /
          ((xAxisDomain ? xAxisDomain[1] : stockData.length - 1) -
            (xAxisDomain ? xAxisDomain[0] : 0))) *
        100;

      // 価格をY座標に変換（反転）
      const [minPrice, maxPrice] = domain;
      const priceRange = maxPrice - minPrice;
      const startY = ((maxPrice - line.startPrice) / priceRange) * 100;
      const endY = ((maxPrice - line.endPrice) / priceRange) * 100;

      const isSelected = selectedLine === line.id;

      return (
        <g key={line.id} onClick={() => setSelectedLine(line.id)}>
          <line
            x1={`${startX}%`}
            y1={`${startY}%`}
            x2={`${endX}%`}
            y2={`${endY}%`}
            stroke={line.color}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={isSelected ? "none" : "none"}
            pointerEvents="all"
            style={{ cursor: "pointer" }}
          />
          {/* 選択された線のハンドルを描画 */}
          {isSelected && (
            <>
              <circle
                cx={`${startX}%`}
                cy={`${startY}%`}
                r={4}
                fill={line.color}
              />
              <circle cx={`${endX}%`} cy={`${endY}%`} r={4} fill={line.color} />
              {/* 削除ボタン */}
              <g
                transform={`translate(${(startX + endX) / 2}%, ${
                  (startY + endY) / 2
                }%)`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLine(line.id);
                }}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x="-10"
                  y="-10"
                  width="20"
                  height="20"
                  fill="white"
                  opacity="0.8"
                  rx="2"
                />
                <text x="0" y="4" textAnchor="middle" fill="red" fontSize="14">
                  ×
                </text>
              </g>
            </>
          )}
        </g>
      );
    });
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-bold text-gray-800">{data.formattedDate}</p>
          <div className="grid grid-cols-2 gap-x-4 mt-1">
            <p className="text-sm text-gray-600">
              始値:{" "}
              <span className="font-medium text-gray-800">{data.open}</span>
            </p>
            <p className="text-sm text-gray-600">
              終値:{" "}
              <span className="font-medium text-gray-800">{data.close}</span>
            </p>
            <p className="text-sm text-gray-600">
              高値:{" "}
              <span className="font-medium text-gray-800">{data.high}</span>
            </p>
            <p className="text-sm text-gray-600">
              安値:{" "}
              <span className="font-medium text-gray-800">{data.low}</span>
            </p>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            出来高:{" "}
            <span className="font-medium text-gray-800">
              {data.volume.toLocaleString()}
            </span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            売買代金:{" "}
            <span className="font-medium text-gray-800">
              {(data.turnoverValue / 1000000).toFixed(1)}M
            </span>
          </p>
          <p
            className={`text-sm font-medium mt-1 ${
              parseFloat(data.change) >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            変化率: {data.change}%
          </p>

          {/* 移動平均線の値 */}
          {indicators.ma20 && data.ma20 && (
            <p className="text-sm text-gray-600">
              MA(20):{" "}
              <span className="font-medium" style={{ color: "#FF5722" }}>
                {data.ma20.toFixed(2)}
              </span>
            </p>
          )}
          {indicators.ma50 && data.ma50 && (
            <p className="text-sm text-gray-600">
              MA(50):{" "}
              <span className="font-medium" style={{ color: "#2196F3" }}>
                {data.ma50.toFixed(2)}
              </span>
            </p>
          )}
          {indicators.ma75 && data.ma75 && (
            <p className="text-sm text-gray-600">
              MA(75):{" "}
              <span className="font-medium" style={{ color: "#4CAF50" }}>
                {data.ma75.toFixed(2)}
              </span>
            </p>
          )}
          {indicators.ma100 && data.ma100 && (
            <p className="text-sm text-gray-600">
              MA(100):{" "}
              <span className="font-medium" style={{ color: "#9C27B0" }}>
                {data.ma100.toFixed(2)}
              </span>
            </p>
          )}
          {indicators.ma200 && data.ma200 && (
            <p className="text-sm text-gray-600">
              MA(200):{" "}
              <span className="font-medium" style={{ color: "#E91E63" }}>
                {data.ma200.toFixed(2)}
              </span>
            </p>
          )}

          {/* ボリンジャーバンドの値 */}
          {indicators.bollingerBands && data.bollingerUpper && (
            <>
              <p className="text-sm text-gray-600">
                BB上限:{" "}
                <span className="font-medium" style={{ color: "#9C27B0" }}>
                  {data.bollingerUpper.toFixed(2)}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                BB中央:{" "}
                <span className="font-medium" style={{ color: "#9C27B0" }}>
                  {data.bollingerMiddle?.toFixed(2)}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                BB下限:{" "}
                <span className="font-medium" style={{ color: "#9C27B0" }}>
                  {data.bollingerLower?.toFixed(2)}
                </span>
              </p>
            </>
          )}

          {/* RSI値 */}
          {indicators.rsi && data.rsi !== null && (
            <p
              className={`text-sm font-medium ${
                (data.rsi as number) > 70
                  ? "text-red-600"
                  : (data.rsi as number) < 30
                  ? "text-green-600"
                  : "text-gray-600"
              }`}
            >
              RSI: {(data.rsi as number).toFixed(2)}
            </p>
          )}

          {/* MACD値 */}
          {indicators.macd &&
            data.macdLine !== null &&
            data.signalLine !== null && (
              <>
                <p className="text-sm text-gray-600">
                  MACD:{" "}
                  <span className="font-medium" style={{ color: "#2196F3" }}>
                    {(data.macdLine as number).toFixed(2)}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Signal:{" "}
                  <span className="font-medium" style={{ color: "#FF5722" }}>
                    {(data.signalLine as number).toFixed(2)}
                  </span>
                </p>
                <p
                  className={`text-sm font-medium ${
                    (data.macdHistogram as number) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  Histogram: {(data.macdHistogram as number).toFixed(2)}
                </p>
              </>
            )}
        </div>
      );
    }
    return null;
  };

  // Calculate stats for display
  const getStats = (): StockStats => {
    if (visibleData.length === 0) return { high: 0, low: 0, avg: "0" };

    const high = Math.max(...visibleData.map((item) => item.high));
    const low = Math.min(...visibleData.map((item) => item.low));
    const avg =
      visibleData.reduce((sum, item) => sum + item.close, 0) /
      visibleData.length;

    return { high, low, avg: avg.toFixed(2) };
  };

  const stats = getStats();

  // メインチャートコンポーネント
  const MainChart = () => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={visibleData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 10 }}
            domain={xAxisDomain || ["auto", "auto"]}
          />
          <YAxis domain={domain} tick={{ fontSize: 10 }} orientation="right" />
          <Tooltip content={<CustomTooltip />} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={showCrosshair ? <CustomCursor /> : false}
          />

          {/* ボリンジャーバンド */}
          {indicators.bollingerBands && (
            <>
              <Area
                type="monotone"
                dataKey="bollingerUpper"
                stroke="#9C27B0"
                strokeDasharray="3 3"
                fill="#9C27B0"
                fillOpacity={0.05}
                dot={false}
                activeDot={false}
                name="BB上限"
              />
              <Line
                type="monotone"
                dataKey="bollingerMiddle"
                stroke="#9C27B0"
                dot={false}
                activeDot={false}
                name="BB中央"
              />
              <Area
                type="monotone"
                dataKey="bollingerLower"
                stroke="#9C27B0"
                strokeDasharray="3 3"
                fill="transparent"
                dot={false}
                activeDot={false}
                name="BB下限"
              />
            </>
          )}

          {/* 移動平均線 */}
          {indicators.ma20 && (
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="#FF5722"
              dot={false}
              strokeWidth={1.5}
              name="MA(20)"
            />
          )}
          {indicators.ma50 && (
            <Line
              type="monotone"
              dataKey="ma50"
              stroke="#2196F3"
              dot={false}
              strokeWidth={1.5}
              name="MA(50)"
            />
          )}
          {indicators.ma75 && (
            <Line
              type="monotone"
              dataKey="ma75"
              stroke="#4CAF50"
              dot={false}
              strokeWidth={1.5}
              name="MA(75)"
            />
          )}
          {indicators.ma100 && (
            <Line
              type="monotone"
              dataKey="ma100"
              stroke="#9C27B0"
              dot={false}
              strokeWidth={1.5}
              name="MA(100)"
            />
          )}
          {indicators.ma200 && (
            <Line
              type="monotone"
              dataKey="ma200"
              stroke="#E91E63"
              dot={false}
              strokeWidth={1.5}
              name="MA(200)"
            />
          )}

          {/* チャートスタイルに応じたレンダリング */}
          {chartStyle === "candlestick" && (
            <Bar
              dataKey="high"
              shape={renderCandlestick}
              isAnimationActive={false}
              id={`volume-chart-${Date.now()}`}
            />
          )}

          {chartStyle === "ohlc" && (
            <Bar
              dataKey="high"
              shape={renderOHLC}
              isAnimationActive={false}
              id={`volume-chart-${Date.now()}`}
            />
          )}

          {chartStyle === "line" && (
            <Line
              type="monotone"
              dataKey="close"
              stroke="#4F46E5"
              dot={false}
              strokeWidth={2}
              name="終値"
            />
          )}

          {chartStyle === "area" && (
            <Area
              type="monotone"
              dataKey="close"
              stroke="#4F46E5"
              fill="#4F46E5"
              fillOpacity={0.1}
              dot={false}
              name="終値"
            />
          )}

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span style={{ fontSize: "0.75rem" }}>{value}</span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // RSIチャート
  const RSIChart = () => {
    if (!indicators.rsi || visibleData.length === 0) return null;

    return (
      <div className="h-32 mb-6">
        <h3 className="text-sm font-medium mb-1">RSI ({rsiPeriod})</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 10 }}
              height={10}
              domain={xAxisDomain || ["auto", "auto"]}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              orientation="right"
              ticks={[0, 30, 50, 70, 100]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 買われすぎライン (70) */}
            <ReferenceLine y={70} stroke="red" strokeDasharray="3 3" />

            {/* 中立ライン (50) */}
            <ReferenceLine y={50} stroke="#666" strokeDasharray="3 3" />

            {/* 売られすぎライン (30) */}
            <ReferenceLine y={30} stroke="green" strokeDasharray="3 3" />

            <Line
              type="monotone"
              dataKey="rsi"
              stroke="#FF9800"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // MACDチャート
  const MACDChart = () => {
    if (!indicators.macd || visibleData.length === 0) return null;

    return (
      <div className="h-32 mb-6">
        <h3 className="text-sm font-medium mb-1">
          MACD ({macdParams.fastPeriod}, {macdParams.slowPeriod},{" "}
          {macdParams.signalPeriod})
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 10 }}
              height={10}
              domain={xAxisDomain || ["auto", "auto"]}
            />
            <YAxis tick={{ fontSize: 10 }} orientation="right" />
            <Tooltip content={<CustomTooltip />} />

            {/* ゼロライン */}
            <ReferenceLine y={0} stroke="#666" />

            {/* MACDヒストグラム */}
            <Bar
              dataKey="macdHistogram"
              fill="#888888"
              opacity={0.7}
              id={`volume-chart-${Date.now()}`}
            >
              {visibleData.map((entry, index) => (
                <Cell
                  key={`volume-cell-${entry.date}-${index}`}
                  fill={(entry.macdHistogram || 0) >= 0 ? "#22c55e" : "#ef4444"}
                />
              ))}
            </Bar>

            {/* MACDライン */}
            <Line
              type="monotone"
              dataKey="macdLine"
              stroke="#2196F3"
              dot={false}
            />

            {/* シグナルライン */}
            <Line
              type="monotone"
              dataKey="signalLine"
              stroke="#FF5722"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // キーボードショートカットヘルプコンポーネント
  const KeyboardShortcutsHelp = () => {
    if (!showKeyboardShortcuts) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">キーボードショートカット</h3>
            <button
              onClick={() => setShowKeyboardShortcuts(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="font-medium">⬅️ ➡️</div>
            <div>左右にパン</div>

            <div className="font-medium">+ / -</div>
            <div>ズームイン / ズームアウト</div>

            <div className="font-medium">Esc</div>
            <div>ズームリセット、描画モードキャンセル</div>

            <div className="font-medium">c</div>
            <div>十字カーソル表示切替</div>

            <div className="font-medium">t</div>
            <div>トレンドライン描画モード</div>

            <div className="font-medium">h</div>
            <div>水平線描画モード</div>

            <div className="font-medium">r</div>
            <div>RSI表示切替</div>

            <div className="font-medium">m</div>
            <div>MACD表示切替</div>

            <div className="font-medium">b</div>
            <div>ボリンジャーバンド表示切替</div>

            <div className="font-medium">1-4</div>
            <div>チャートスタイル切替</div>

            <div className="font-medium">?</div>
            <div>このヘルプを表示</div>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setShowKeyboardShortcuts(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  };

  // キーボードショートカットハンドラー
  useEffect(() => {
    // キーボードイベント処理関数
    const handleKeyDown = (e: KeyboardEvent) => {
      // チャートコンテナがフォーカスを持っているか確認
      // if (!chartContainerRef.current?.contains(document.activeElement) &&
      //     document.activeElement !== chartContainerRef.current) {
      //   return;
      // }

      // 処理するキーのデフォルト動作を防止
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "+",
          "-",
          "c",
          "t",
          "h",
          "r",
          "m",
          "b",
          "1",
          "2",
          "3",
          "4",
          "?",
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      // ナビゲーションショートカット
      if (e.key === "ArrowLeft") {
        // 左にパン
        if (xAxisDomain) {
          const domainRange = xAxisDomain[1] - xAxisDomain[0];
          const panAmount = domainRange * 0.1;
          const newStart = Math.max(0, xAxisDomain[0] - panAmount);
          const newEnd = newStart + domainRange;

          if (newEnd <= stockData.length - 1) {
            setXAxisDomain([newStart, newEnd]);
            updateVisibleData(newStart, newEnd);
          }
        }
      } else if (e.key === "ArrowRight") {
        // 右にパン
        if (xAxisDomain) {
          const domainRange = xAxisDomain[1] - xAxisDomain[0];
          const panAmount = domainRange * 0.1;
          const newEnd = Math.min(
            stockData.length - 1,
            xAxisDomain[1] + panAmount
          );
          const newStart = newEnd - domainRange;

          if (newStart >= 0) {
            setXAxisDomain([newStart, newEnd]);
            updateVisibleData(newStart, newEnd);
          }
        }
      } else if (e.key === "+" || e.key === "=") {
        // ズームイン
        if (xAxisDomain) {
          const start = xAxisDomain[0];
          const end = xAxisDomain[1];
          const range = end - start;
          const newRange = range * 0.8;

          // 中心からズームイン
          const center = (start + end) / 2;
          const newStart = Math.max(0, center - newRange / 2);
          const newEnd = Math.min(stockData.length - 1, center + newRange / 2);

          setXAxisDomain([newStart, newEnd]);
          updateVisibleData(newStart, newEnd);
        }
      } else if (e.key === "-" || e.key === "_") {
        // ズームアウト
        if (xAxisDomain) {
          const start = xAxisDomain[0];
          const end = xAxisDomain[1];
          const range = end - start;
          const newRange = range * 1.2;

          // 中心からズームアウト
          const center = (start + end) / 2;
          const newStart = Math.max(0, center - newRange / 2);
          const newEnd = Math.min(stockData.length - 1, center + newRange / 2);

          setXAxisDomain([newStart, newEnd]);
          updateVisibleData(newStart, newEnd);
        }
      } else if (e.key === "Escape") {
        // ズームリセット
        resetZoom();

        // 描画モードをクリア
        setDrawingMode(null);
      } else if (e.key === "c") {
        // クロスヘアー切替
        toggleCrosshair();
      } else if (e.key === "t") {
        // トレンドライン描画モード切替
        toggleDrawingMode(drawingMode === "trendline" ? null : "trendline");
      } else if (e.key === "h") {
        // 水平線描画モード切替
        toggleDrawingMode(
          drawingMode === "horizontalline" ? null : "horizontalline"
        );
      } else if (e.key === "r") {
        // RSI表示切替
        setIndicators((prev) => ({ ...prev, rsi: !prev.rsi }));
      } else if (e.key === "m") {
        // MACD表示切替
        setIndicators((prev) => ({ ...prev, macd: !prev.macd }));
      } else if (e.key === "b") {
        // ボリンジャーバンド表示切替
        setIndicators((prev) => ({
          ...prev,
          bollingerBands: !prev.bollingerBands,
        }));
      } else if (e.key === "1") {
        // ローソク足に切替
        setChartStyle("candlestick");
      } else if (e.key === "2") {
        // OHLCに切替
        setChartStyle("ohlc");
      } else if (e.key === "3") {
        // ラインに切替
        setChartStyle("line");
      } else if (e.key === "4") {
        // エリアに切替
        setChartStyle("area");
      } else if (e.key === "?") {
        // キーボードショートカットヘルプ表示切替
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
      }
    };

    // イベントリスナーを追加
    window.addEventListener("keydown", handleKeyDown);

    // クリーンアップ
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    xAxisDomain,
    stockData.length,
    showCrosshair,
    drawingMode,
    indicators,
    chartStyle,
    showKeyboardShortcuts,
    resetZoom,
    toggleCrosshair,
    updateVisibleData,
  ]);

  // ロード完了時にチャートにフォーカスを設定
  useEffect(() => {
    // if (chartContainerRef.current && !loading && stockData.length > 0) {
    //   chartContainerRef.current.focus();
    // }
  }, [loading, stockData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">読み込み中...</div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        {error}
      </div>
    );
  }

  if (stockData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        データがありません
      </div>
    );
  }

  // Calculate the min and max prices for the domain
  // テクニカル指標の値も含めて計算
  const calculateDomain = (): [number, number] => {
    let minPrice = Math.min(...visibleData.map((item) => item.low));
    let maxPrice = Math.max(...visibleData.map((item) => item.high));

    // 移動平均線の値も考慮
    if (indicators.ma20) {
      const ma20Values = visibleData
        .filter((d) => d.ma20 !== null)
        .map((d) => d.ma20 as number);
      if (ma20Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma20Values);
        maxPrice = Math.max(maxPrice, ...ma20Values);
      }
    }

    if (indicators.ma50) {
      const ma50Values = visibleData
        .filter((d) => d.ma50 !== null)
        .map((d) => d.ma50 as number);
      if (ma50Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma50Values);
        maxPrice = Math.max(maxPrice, ...ma50Values);
      }
    }

    if (indicators.ma75) {
      const ma75Values = visibleData
        .filter((d) => d.ma75 !== null)
        .map((d) => d.ma75 as number);
      if (ma75Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma75Values);
        maxPrice = Math.max(maxPrice, ...ma75Values);
      }
    }

    if (indicators.ma100) {
      const ma100Values = visibleData
        .filter((d) => d.ma100 !== null)
        .map((d) => d.ma100 as number);
      if (ma100Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma100Values);
        maxPrice = Math.max(maxPrice, ...ma100Values);
      }
    }

    if (indicators.ma200) {
      const ma200Values = visibleData
        .filter((d) => d.ma200 !== null)
        .map((d) => d.ma200 as number);
      if (ma200Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma200Values);
        maxPrice = Math.max(maxPrice, ...ma200Values);
      }
    }

    // ボリンジャーバンドの値も考慮
    if (indicators.bollingerBands) {
      const upperValues = visibleData
        .filter((d) => d.bollingerUpper !== null)
        .map((d) => d.bollingerUpper as number);
      const lowerValues = visibleData
        .filter((d) => d.bollingerLower !== null)
        .map((d) => d.bollingerLower as number);

      if (upperValues.length > 0) {
        maxPrice = Math.max(maxPrice, ...upperValues);
      }

      if (lowerValues.length > 0) {
        minPrice = Math.min(minPrice, ...lowerValues);
      }
    }

    // Add some padding to the domain
    const padding = (maxPrice - minPrice) * 0.05;
    return [minPrice - padding, maxPrice + padding];
  };

  const domain = calculateDomain();

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">
        Stock {stockData[0]?.code || "130A0"} チャート
      </h2>

      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          <p>
            操作方法: <span className="font-medium">マウスホイール</span>
            でズーム、<span className="font-medium">ドラッグ</span>で移動
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm flex items-center"
          >
            <span className="mr-1">⌨️</span>
            <span>ショートカット</span>
          </button>
          <button
            onClick={resetZoom}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
          >
            全体表示に戻す
          </button>
        </div>
      </div>

      {/* チャートスタイル切替コントロール */}
      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">チャートスタイル:</span>
          <button
            onClick={() => setChartStyle("candlestick")}
            className={`px-3 py-1 text-sm rounded ${
              chartStyle === "candlestick"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            ローソク足
          </button>
          <button
            onClick={() => setChartStyle("ohlc")}
            className={`px-3 py-1 text-sm rounded ${
              chartStyle === "ohlc"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            OHLC
          </button>
          <button
            onClick={() => setChartStyle("line")}
            className={`px-3 py-1 text-sm rounded ${
              chartStyle === "line"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            ライン
          </button>
          <button
            onClick={() => setChartStyle("area")}
            className={`px-3 py-1 text-sm rounded ${
              chartStyle === "area"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            エリア
          </button>
        </div>
      </div>

      {/* 描画ツールコントロール */}
      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-sm font-medium">描画ツール:</span>
          <button
            onClick={() => toggleDrawingMode("trendline")}
            className={`px-3 py-1 text-sm rounded ${
              drawingMode === "trendline"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            トレンドライン
          </button>
          <button
            onClick={() => toggleDrawingMode("horizontalline")}
            className={`px-3 py-1 text-sm rounded ${
              drawingMode === "horizontalline"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            水平線
          </button>
          {drawingLines.length > 0 && (
            <button
              onClick={() => setDrawingLines([])}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
            >
              すべて削除
            </button>
          )}

          {/* クロスヘアー切替 */}
          <label className="inline-flex items-center ml-4">
            <input
              type="checkbox"
              checked={showCrosshair}
              onChange={toggleCrosshair}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm">十字カーソル</span>
          </label>
        </div>
      </div>

      {/* テクニカル指標の切替コントロール */}
      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-sm font-medium">移動平均線:</span>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma20}
              onChange={() => toggleIndicator("ma20")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#FF5722" }}>
              MA(20)
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma50}
              onChange={() => toggleIndicator("ma50")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#2196F3" }}>
              MA(50)
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma75}
              onChange={() => toggleIndicator("ma75")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#4CAF50" }}>
              MA(75)
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma100}
              onChange={() => toggleIndicator("ma100")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#9C27B0" }}>
              MA(100)
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma200}
              onChange={() => toggleIndicator("ma200")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#E91E63" }}>
              MA(200)
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-2">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.bollingerBands}
              onChange={() => toggleIndicator("bollingerBands")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm font-medium">ボリンジャーバンド</span>
          </label>

          {indicators.bollingerBands && (
            <>
              <div className="flex items-center ml-4">
                <span className="text-sm mr-2">期間:</span>
                <select
                  value={bollingerPeriod}
                  onChange={(e) => setBollingerPeriod(Number(e.target.value))}
                  className="form-select text-sm border border-gray-300 rounded p-1"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
              <div className="flex items-center">
                <span className="text-sm mr-2">標準偏差:</span>
                <select
                  value={bollingerStdDev}
                  onChange={(e) => setBollingerStdDev(Number(e.target.value))}
                  className="form-select text-sm border border-gray-300 rounded p-1"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="2.5">2.5</option>
                  <option value="3">3</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* RSIコントロール */}
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.rsi}
              onChange={() => toggleIndicator("rsi")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm font-medium">RSI</span>
          </label>

          {indicators.rsi && (
            <div className="flex items-center ml-2">
              <span className="text-sm mr-2">期間:</span>
              <select
                value={rsiPeriod}
                onChange={(e) => setRsiPeriod(Number(e.target.value))}
                className="form-select text-sm border border-gray-300 rounded p-1"
              >
                <option value="5">5</option>
                <option value="9">9</option>
                <option value="14">14</option>
                <option value="21">21</option>
              </select>
            </div>
          )}

          {/* MACDコントロール */}
          <label className="inline-flex items-center ml-4">
            <input
              type="checkbox"
              checked={indicators.macd}
              onChange={() => toggleIndicator("macd")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm font-medium">MACD</span>
          </label>

          {indicators.macd && (
            <div className="flex items-center ml-2 space-x-2">
              <div className="flex items-center">
                <span className="text-sm mr-1">Fast:</span>
                <select
                  value={macdParams.fastPeriod}
                  onChange={(e) =>
                    setMacdParams({
                      ...macdParams,
                      fastPeriod: Number(e.target.value),
                    })
                  }
                  className="form-select text-sm border border-gray-300 rounded p-1 w-12"
                >
                  <option value="8">8</option>
                  <option value="12">12</option>
                  <option value="16">16</option>
                </select>
              </div>
              <div className="flex items-center">
                <span className="text-sm mr-1">Slow:</span>
                <select
                  value={macdParams.slowPeriod}
                  onChange={(e) =>
                    setMacdParams({
                      ...macdParams,
                      slowPeriod: Number(e.target.value),
                    })
                  }
                  className="form-select text-sm border border-gray-300 rounded p-1 w-12"
                >
                  <option value="21">21</option>
                  <option value="26">26</option>
                  <option value="30">30</option>
                </select>
              </div>
              <div className="flex items-center">
                <span className="text-sm mr-1">Signal:</span>
                <select
                  value={macdParams.signalPeriod}
                  onChange={(e) =>
                    setMacdParams({
                      ...macdParams,
                      signalPeriod: Number(e.target.value),
                    })
                  }
                  className="form-select text-sm border border-gray-300 rounded p-1 w-12"
                >
                  <option value="7">7</option>
                  <option value="9">9</option>
                  <option value="12">12</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm text-gray-600">最高値</p>
          <p className="text-lg font-bold">{stats.high}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm text-gray-600">最安値</p>
          <p className="text-lg font-bold">{stats.low}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm text-gray-600">平均値</p>
          <p className="text-lg font-bold">{stats.avg}</p>
        </div>
      </div>

      {/* Candlestick Chart with zoom/pan capabilities */}
      <div
        className="h-64 mb-6 cursor-grab active:cursor-grabbing relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={chartRef}
        tabIndex={0}
      >
        <MainChart />
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ overflow: "visible" }}
        >
          {renderDrawingLines()}
        </svg>
      </div>

      {/* Volume Chart */}
      <div className="h-32 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 10 }}
              domain={xAxisDomain || ["auto", "auto"]}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              orientation="right"
              tickFormatter={(tick: number): string =>
                (tick / 1000000).toFixed(1) + "M"
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="volume"
              name="出来高"
              id={`volume-chart-${Date.now()}`}
            >
              {visibleData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.close >= entry.open ? "#22c55e" : "#ef4444"}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RSIとMACDチャート */}
      {indicators.rsi && <RSIChart />}
      {indicators.macd && <MACDChart />}

      {/* Navigation Minimap */}
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stockData}
            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="formattedDate"
              height={0}
              tick={false}
              axisLine={false}
            />
            <Brush
              dataKey="formattedDate"
              height={20}
              stroke="#4F46E5"
              startIndex={xAxisDomain ? Math.floor(xAxisDomain[0]) : 0}
              endIndex={
                xAxisDomain ? Math.ceil(xAxisDomain[1]) : stockData.length - 1
              }
              onChange={(brushData) => {
                if (
                  brushData.startIndex !== undefined &&
                  brushData.endIndex !== undefined
                ) {
                  setXAxisDomain([brushData.startIndex, brushData.endIndex]);
                  updateVisibleData(brushData.startIndex, brushData.endIndex);
                }
              }}
            />
            <Bar
              dataKey="volume"
              fill="#CBD5E1"
              fillOpacity={0.5}
              id={`volume-chart-${Date.now()}`}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Current Price Info */}
      {stockData.length > 0 && (
        <div className="mt-6 p-4 border border-gray-200 rounded">
          <h3 className="font-bold">
            最新価格情報 ({stockData[stockData.length - 1].formattedDate})
          </h3>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm text-gray-600">始値</p>
              <p className="font-bold">
                {stockData[stockData.length - 1].open}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">終値</p>
              <p className="font-bold">
                {stockData[stockData.length - 1].close}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">高値</p>
              <p className="font-bold">
                {stockData[stockData.length - 1].high}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">安値</p>
              <p className="font-bold">{stockData[stockData.length - 1].low}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>
          凡例：{" "}
          <span className="inline-block w-3 h-3 bg-green-500 mr-1"></span>{" "}
          陽線（上昇）/{" "}
          <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span>{" "}
          陰線（下降）
        </p>
      </div>

      {/* キーボードショートカットヘルプ */}
      <KeyboardShortcutsHelp />
    </div>
  );
};

export default StockChart;
