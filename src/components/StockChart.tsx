import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  ComposedChart, Brush, Line, Legend, Area
} from 'recharts';

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

const StockChart: React.FC = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [stockDataWithIndicators, setStockDataWithIndicators] = useState<StockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chart interaction states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [visibleData, setVisibleData] = useState<StockData[]>([]);
  const [xAxisDomain, setXAxisDomain] = useState<[number, number] | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // テクニカル指標の表示状態
  const [indicators, setIndicators] = useState<TechnicalIndicators>({
    ma20: false,
    ma50: false,
    ma75: false,
    ma100: false,
    ma200: false,
    bollingerBands: false
  });

  // ボリンジャーバンドの設定
  const [bollingerPeriod, setBollingerPeriod] = useState<number>(20);
  const [bollingerStdDev, setBollingerStdDev] = useState<number>(2);

  // 単純移動平均（SMA）を計算する関数
  const calculateSMA = (data: StockData[], period: number): (number | null)[] => {
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
  ): { upper: (number | null)[], middle: (number | null)[], lower: (number | null)[] } => {
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

  useEffect(() => {
    // Fetch data from JSON file in public directory
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch JSON from public directory
        const response = await fetch('/130A0.json');

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const jsonData: StockDataResponse = await response.json();

        // Process the data from JSON format to our StockData format
        const processedData: StockData[] = jsonData.daily_quotes.map(item => {
          // Calculate percent change
          const percentChange = ((item.Close - item.Open) / item.Open * 100).toFixed(2);

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
            isUp: item.Close >= item.Open
          };
        });

        // Sort by date
        const sortedData = processedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setStockData(sortedData);
        setVisibleData(sortedData); // Initially show all data
        setError(null);
      } catch (err) {
        console.error("Error fetching stock data:", err);
        setError("株価データの読み込みに失敗しました。JSONファイルが正しく配置されているか確認してください。");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // テクニカル指標を計算して適用
  useEffect(() => {
    if (stockData.length > 0) {
      // データに移動平均線とボリンジャーバンドを追加
      const dataWithIndicators = [...stockData];

      // 移動平均線を計算
      const ma20 = calculateSMA(stockData, 20);
      const ma50 = calculateSMA(stockData, 50);
      const ma75 = calculateSMA(stockData, 75);
      const ma100 = calculateSMA(stockData, 100);
      const ma200 = calculateSMA(stockData, 200);

      // ボリンジャーバンドを計算
      const { upper, middle, lower } = calculateBollingerBands(stockData, bollingerPeriod, bollingerStdDev);

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
  }, [stockData, bollingerPeriod, bollingerStdDev]);

  // Format date for display
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

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
    const newRange = Math.max(5, Math.min(stockData.length, range * zoomFactor));

    // Calculate the center point of the current view as a ratio
    const center = (e.nativeEvent.offsetX / e.currentTarget.clientWidth);

    // Calculate new start and end based on the center point
    let newStart = Math.max(0, start + (range - newRange) * center);
    let newEnd = Math.min(stockData.length - 1, newStart + newRange);

    // Adjust start if end is at maximum
    if (newEnd === stockData.length - 1) {
      newStart = Math.max(0, newEnd - newRange);
    }

    setXAxisDomain([newStart, newEnd]);
    updateVisibleData(newStart, newEnd);
  };

  // Handle pan by dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || dragStartX === null || !xAxisDomain) return;

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
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartX(null);
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

  // テクニカル指標の表示切替
  const toggleIndicator = (indicator: keyof TechnicalIndicators) => {
    setIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  // Add custom renderer for the candlestick chart
  const renderCandlestick = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const { open, close, high, low } = payload;

    const isUp = close >= open;
    const color = isUp ? '#22c55e' : '#ef4444';

    // Calculate the body height and position
    const maxHeight = height;

    // Get the price range for proper scaling
    const allPrices = visibleData.flatMap(d => [d.high, d.low]);
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

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-bold text-gray-800">{data.formattedDate}</p>
          <div className="grid grid-cols-2 gap-x-4 mt-1">
            <p className="text-sm text-gray-600">始値: <span className="font-medium text-gray-800">{data.open}</span></p>
            <p className="text-sm text-gray-600">終値: <span className="font-medium text-gray-800">{data.close}</span></p>
            <p className="text-sm text-gray-600">高値: <span className="font-medium text-gray-800">{data.high}</span></p>
            <p className="text-sm text-gray-600">安値: <span className="font-medium text-gray-800">{data.low}</span></p>
          </div>
          <p className="text-sm text-gray-600 mt-1">出来高: <span className="font-medium text-gray-800">{data.volume.toLocaleString()}</span></p>
          <p className="text-sm text-gray-600 mt-1">売買代金: <span className="font-medium text-gray-800">{(data.turnoverValue / 1000000).toFixed(1)}M</span></p>
          <p className={`text-sm font-medium mt-1 ${parseFloat(data.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            変化率: {data.change}%
          </p>

          {/* 移動平均線の値 */}
          {indicators.ma20 && data.ma20 && (
            <p className="text-sm text-gray-600">MA(20): <span className="font-medium" style={{ color: '#FF5722' }}>{data.ma20.toFixed(2)}</span></p>
          )}
          {indicators.ma50 && data.ma50 && (
            <p className="text-sm text-gray-600">MA(50): <span className="font-medium" style={{ color: '#2196F3' }}>{data.ma50.toFixed(2)}</span></p>
          )}
          {indicators.ma75 && data.ma75 && (
            <p className="text-sm text-gray-600">MA(75): <span className="font-medium" style={{ color: '#4CAF50' }}>{data.ma75.toFixed(2)}</span></p>
          )}
          {indicators.ma100 && data.ma100 && (
            <p className="text-sm text-gray-600">MA(100): <span className="font-medium" style={{ color: '#9C27B0' }}>{data.ma100.toFixed(2)}</span></p>
          )}
          {indicators.ma200 && data.ma200 && (
            <p className="text-sm text-gray-600">MA(200): <span className="font-medium" style={{ color: '#E91E63' }}>{data.ma200.toFixed(2)}</span></p>
          )}

          {/* ボリンジャーバンドの値 */}
          {indicators.bollingerBands && data.bollingerUpper && (
            <>
              <p className="text-sm text-gray-600">BB上限: <span className="font-medium" style={{ color: '#9C27B0' }}>{data.bollingerUpper.toFixed(2)}</span></p>
              <p className="text-sm text-gray-600">BB中央: <span className="font-medium" style={{ color: '#9C27B0' }}>{data.bollingerMiddle?.toFixed(2)}</span></p>
              <p className="text-sm text-gray-600">BB下限: <span className="font-medium" style={{ color: '#9C27B0' }}>{data.bollingerLower?.toFixed(2)}</span></p>
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

    const high = Math.max(...visibleData.map(item => item.high));
    const low = Math.min(...visibleData.map(item => item.low));
    const avg = visibleData.reduce((sum, item) => sum + item.close, 0) / visibleData.length;

    return { high, low, avg: avg.toFixed(2) };
  };

  const stats = getStats();

  if (loading) {
    return <div className="flex justify-center items-center h-64">読み込み中...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-64 text-red-600">{error}</div>;
  }

  if (stockData.length === 0) {
    return <div className="flex justify-center items-center h-64">データがありません</div>;
  }

  // Calculate the min and max prices for the domain
  // テクニカル指標の値も含めて計算
  const calculateDomain = (): [number, number] => {
    let minPrice = Math.min(...visibleData.map(item => item.low));
    let maxPrice = Math.max(...visibleData.map(item => item.high));

    // 移動平均線の値も考慮
    if (indicators.ma20) {
      const ma20Values = visibleData.filter(d => d.ma20 !== null).map(d => d.ma20 as number);
      if (ma20Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma20Values);
        maxPrice = Math.max(maxPrice, ...ma20Values);
      }
    }

    if (indicators.ma50) {
      const ma50Values = visibleData.filter(d => d.ma50 !== null).map(d => d.ma50 as number);
      if (ma50Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma50Values);
        maxPrice = Math.max(maxPrice, ...ma50Values);
      }
    }

    if (indicators.ma75) {
      const ma75Values = visibleData.filter(d => d.ma75 !== null).map(d => d.ma75 as number);
      if (ma75Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma75Values);
        maxPrice = Math.max(maxPrice, ...ma75Values);
      }
    }

    if (indicators.ma100) {
      const ma100Values = visibleData.filter(d => d.ma100 !== null).map(d => d.ma100 as number);
      if (ma100Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma100Values);
        maxPrice = Math.max(maxPrice, ...ma100Values);
      }
    }

    if (indicators.ma200) {
      const ma200Values = visibleData.filter(d => d.ma200 !== null).map(d => d.ma200 as number);
      if (ma200Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma200Values);
        maxPrice = Math.max(maxPrice, ...ma200Values);
      }
    }

    // ボリンジャーバンドの値も考慮
    if (indicators.bollingerBands) {
      const upperValues = visibleData.filter(d => d.bollingerUpper !== null).map(d => d.bollingerUpper as number);
      const lowerValues = visibleData.filter(d => d.bollingerLower !== null).map(d => d.bollingerLower as number);

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
      <h2 className="text-xl font-bold mb-4">Stock {stockData[0]?.code || "130A0"} ローソク足チャート</h2>

      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          <p>操作方法: <span className="font-medium">マウスホイール</span>でズーム、<span className="font-medium">ドラッグ</span>で移動</p>
        </div>
        <button
          onClick={resetZoom}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
        >
          全体表示に戻す
        </button>
      </div>

      {/* テクニカル指標の切替コントロール */}
      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-sm font-medium">移動平均線:</span>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma20}
              onChange={() => toggleIndicator('ma20')}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: '#FF5722' }}>MA(20)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma50}
              onChange={() => toggleIndicator('ma50')}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: '#2196F3' }}>MA(50)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma75}
              onChange={() => toggleIndicator('ma75')}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: '#4CAF50' }}>MA(75)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma100}
              onChange={() => toggleIndicator('ma100')}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: '#9C27B0' }}>MA(100)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma200}
              onChange={() => toggleIndicator('ma200')}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: '#E91E63' }}>MA(200)</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.bollingerBands}
              onChange={() => toggleIndicator('bollingerBands')}
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
        className="h-64 mb-6 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={chartRef}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 10 }}
              domain={xAxisDomain || ['auto', 'auto']}
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 10 }}
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />

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

            {/* Use Bar with custom shape for candlesticks */}
            <Bar
              dataKey="high"
              shape={renderCandlestick}
              isAnimationActive={false}
            />

            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => <span style={{ fontSize: '0.75rem' }}>{value}</span>}
            />
          </ComposedChart>
        </ResponsiveContainer>
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
              domain={xAxisDomain || ['auto', 'auto']}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              orientation="right"
              tickFormatter={(tick: number): string => (tick / 1000000).toFixed(1) + 'M'}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" name="出来高">
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
              endIndex={xAxisDomain ? Math.ceil(xAxisDomain[1]) : stockData.length - 1}
              onChange={(brushData) => {
                if (brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
                  setXAxisDomain([brushData.startIndex, brushData.endIndex]);
                  updateVisibleData(brushData.startIndex, brushData.endIndex);
                }
              }}
            />
            <Bar dataKey="volume" fill="#CBD5E1" fillOpacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Current Price Info */}
      {stockData.length > 0 && (
        <div className="mt-6 p-4 border border-gray-200 rounded">
          <h3 className="font-bold">最新価格情報 ({stockData[stockData.length - 1].formattedDate})</h3>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm text-gray-600">始値</p>
              <p className="font-bold">{stockData[stockData.length - 1].open}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">終値</p>
              <p className="font-bold">{stockData[stockData.length - 1].close}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">高値</p>
              <p className="font-bold">{stockData[stockData.length - 1].high}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">安値</p>
              <p className="font-bold">{stockData[stockData.length - 1].low}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>凡例： <span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> 陽線（上昇）/ <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span> 陰線（下降）</p>
      </div>
    </div>
  );
};

export default StockChart;
