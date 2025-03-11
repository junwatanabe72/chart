import { StockData } from "../types/stockTypes";

// 単純移動平均（SMA）を計算する関数
export const calculateSMA = (
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
export const calculateBollingerBands = (
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
export const calculateRSI = (
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
export const calculateMACD = (
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

// 日付フォーマット関数
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}
