// canvas-charts.js - Canvas-based charts

export class LineChart {
  constructor(container, data, opts = {}) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
    this.data = data;
    this.opts = { width: 400, height: 300, ...opts };
    this.resize();
    this.update(data);
  }

  resize() {
    this.canvas.width = this.opts.width;
    this.canvas.height = this.opts.height;
  }

  update(data) {
    this.data = data;
    this.draw();
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Simple line chart
    const { labels, datasets } = this.data;
    const w = canvas.width, h = canvas.height;
    const pad = 40;
    const plotW = w - 2 * pad, plotH = h - 2 * pad;
    const maxVal = Math.max(...datasets.flatMap(d => d.data));
    const xStep = plotW / (labels.length - 1);
    const yScale = plotH / maxVal;

    // Axes
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad);
    ctx.moveTo(pad, h - pad); ctx.lineTo(w - pad, h - pad);
    ctx.stroke();

    // Lines
    datasets.forEach((ds, i) => {
      ctx.strokeStyle = ds.color || ['#ff0000', '#00ff00', '#0000ff'][i % 3];
      ctx.beginPath();
      ds.data.forEach((val, j) => {
        const x = pad + j * xStep;
        const y = h - pad - val * yScale;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
}

export class BarChart {
  constructor(container, data, opts = {}) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
    this.data = data;
    this.opts = { width: 400, height: 300, ...opts };
    this.resize();
    this.update(data);
  }

  resize() {
    this.canvas.width = this.opts.width;
    this.canvas.height = this.opts.height;
  }

  update(data) {
    this.data = data;
    this.draw();
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { labels, datasets } = this.data;
    const w = canvas.width, h = canvas.height;
    const pad = 40;
    const plotW = w - 2 * pad, plotH = h - 2 * pad;
    const maxVal = Math.max(...datasets.flatMap(d => d.data));
    const barW = plotW / labels.length / datasets.length;
    const yScale = plotH / maxVal;

    datasets.forEach((ds, i) => {
      ctx.fillStyle = ds.color || ['#ff0000', '#00ff00', '#0000ff'][i % 3];
      ds.data.forEach((val, j) => {
        const x = pad + j * (plotW / labels.length) + i * barW;
        const barH = val * yScale;
        const y = h - pad - barH;
        ctx.fillRect(x, y, barW, barH);
      });
    });
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
}

export class PieChart {
  constructor(container, data, opts = {}) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
    this.data = data;
    this.opts = { width: 400, height: 300, ...opts };
    this.resize();
    this.update(data);
  }

  resize() {
    this.canvas.width = this.opts.width;
    this.canvas.height = this.opts.height;
  }

  update(data) {
    this.data = data;
    this.draw();
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { labels, datasets } = this.data;
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const ds = datasets[0];
    const total = ds.data.reduce((a, b) => a + b, 0);
    let startAngle = 0;
    ds.data.forEach((val, i) => {
      const sliceAngle = (val / total) * 2 * Math.PI;
      ctx.fillStyle = ds.colors ? ds.colors[i] : `hsl(${i * 360 / ds.data.length}, 70%, 50%)`;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      startAngle += sliceAngle;
    });
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
}

export function createChartComponentForSWAT(ChartClass) {
  return (opts) => {
    const container = document.createElement('div');
    const chart = new ChartClass(container, opts.data, opts);
    container._chart = chart;
    container.update = (data) => chart.update(data);
    return container;
  };
}