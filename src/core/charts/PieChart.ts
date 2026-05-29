import { pie, arc, type PieArcDatum } from 'd3-shape';
import { ChartComponent, type ChartAccessibility } from './ChartComponent';

export interface PieDatum {
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

export interface PieChartOptions {
  data: PieDatum[];
  title: string;
  description: string;
  showLegend?: boolean;
}

export class PieChart extends ChartComponent {
  private readonly opts: Required<Pick<PieChartOptions, 'showLegend'>> & PieChartOptions;

  constructor(opts: PieChartOptions) {
    super();
    this.opts = { showLegend: true, ...opts };
  }

  protected override accessibility(): ChartAccessibility {
    return { title: this.opts.title, description: this.opts.description };
  }

  protected override defaultAspectRatio(): number {
    return this.opts.showLegend ? 16 / 9 : 1;
  }

  protected override drawChart(): void {
    const data = this.opts.data.filter((d) => d.value > 0);
    if (data.length === 0) return;

    const legendWidth = this.opts.showLegend ? Math.min(220, this.width * 0.45) : 0;
    const chartArea = this.width - legendWidth;
    const radius = Math.max(20, Math.min(chartArea, this.height) / 2 - 8);
    const cx = chartArea / 2;
    const cy = this.height / 2;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const pieGen = pie<PieDatum>().value((d) => d.value).sort(null);
    const arcGen = arc<PieArcDatum<PieDatum>>().innerRadius(0).outerRadius(radius);

    const slices = pieGen(data);

    const g = this.layer().attr('transform', `translate(${cx},${cy})`);

    g.selectAll('path.chart__slice')
      .data(slices)
      .enter()
      .append('path')
      .attr('class', 'chart__slice')
      .attr('d', (d) => arcGen(d))
      .attr('fill', (d) => d.data.color)
      .attr('stroke', 'var(--color-bg, #fff)')
      .attr('stroke-width', 2)
      .append('title')
      .text((d) => {
        const pct = ((d.data.value / total) * 100).toFixed(1);
        return `${d.data.label}: ${d.data.formattedValue ?? d.data.value} (${pct}%)`;
      });

    if (this.opts.showLegend) {
      this.drawLegend(data, total, chartArea);
    }
  }

  private drawLegend(data: PieDatum[], total: number, chartArea: number): void {
    const legend = this.layer('chart__legend').attr(
      'transform',
      `translate(${chartArea + 8},${Math.max(8, this.height / 2 - data.length * 12)})`,
    );

    const rowH = 22;
    const rows = legend
      .selectAll<SVGGElement, PieDatum>('g.legend-row')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'legend-row')
      .attr('transform', (_d, i) => `translate(0,${i * rowH})`);

    rows
      .append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', (d) => d.color);

    rows
      .append('text')
      .attr('class', 'chart__label')
      .attr('x', 18)
      .attr('y', 10)
      .text((d) => {
        const pct = ((d.value / total) * 100).toFixed(1);
        return `${d.label} — ${pct}%`;
      });
  }
}
