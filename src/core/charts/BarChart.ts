import { scaleLinear, scaleBand } from 'd3-scale';
import { max as d3max } from 'd3-array';
import { ChartComponent, type ChartAccessibility } from './ChartComponent';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

export interface BarChartOptions {
  data: BarDatum[];
  title: string;
  description: string;
  orientation?: 'horizontal' | 'vertical';
}

export class BarChart extends ChartComponent {
  private readonly opts: Required<Pick<BarChartOptions, 'orientation'>> & BarChartOptions;

  constructor(opts: BarChartOptions) {
    super();
    this.opts = { orientation: 'horizontal', ...opts };
  }

  protected override accessibility(): ChartAccessibility {
    return { title: this.opts.title, description: this.opts.description };
  }

  protected override defaultAspectRatio(): number {
    return this.opts.orientation === 'horizontal' ? 16 / 7 : 4 / 3;
  }

  protected override drawChart(): void {
    if (this.opts.orientation === 'horizontal') {
      this.drawHorizontal();
    } else {
      this.drawVertical();
    }
  }

  private drawHorizontal(): void {
    const data = this.opts.data;
    const padding = { top: 12, right: 80, bottom: 12, left: 130 };
    const innerW = Math.max(10, this.width - padding.left - padding.right);
    const innerH = Math.max(10, this.height - padding.top - padding.bottom);
    const maxVal = Math.max(d3max(data, (d) => d.value) ?? 0, 0.0001);

    const x = scaleLinear().domain([0, maxVal]).range([0, innerW]);
    const y = scaleBand<string>()
      .domain(data.map((d) => d.label))
      .range([0, innerH])
      .padding(0.25);

    const g = this.layer().attr('transform', `translate(${padding.left},${padding.top})`);

    const rows = g
      .selectAll<SVGGElement, BarDatum>('g.bar-row')
      .data(data, (d) => d.label)
      .enter()
      .append('g')
      .attr('class', 'bar-row')
      .attr('transform', (d) => `translate(0,${y(d.label) ?? 0})`);

    rows
      .append('text')
      .attr('class', 'chart__label')
      .attr('x', -8)
      .attr('y', y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text((d) => d.label);

    rows
      .append('rect')
      .attr('class', 'chart__bar')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', (d) => Math.max(1, x(d.value)))
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', (d) => d.color)
      .append('title')
      .text((d) => `${d.label}: ${d.formattedValue ?? d.value}`);

    rows
      .append('text')
      .attr('class', 'chart__value')
      .attr('x', (d) => x(d.value) + 6)
      .attr('y', y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .text((d) => d.formattedValue ?? String(d.value));
  }

  private drawVertical(): void {
    const data = this.opts.data;
    const padding = { top: 16, right: 16, bottom: 40, left: 40 };
    const innerW = Math.max(10, this.width - padding.left - padding.right);
    const innerH = Math.max(10, this.height - padding.top - padding.bottom);
    const maxVal = Math.max(d3max(data, (d) => d.value) ?? 0, 0.0001);

    const x = scaleBand<string>()
      .domain(data.map((d) => d.label))
      .range([0, innerW])
      .padding(0.2);
    const y = scaleLinear().domain([0, maxVal]).range([innerH, 0]);

    const g = this.layer().attr('transform', `translate(${padding.left},${padding.top})`);

    const cols = g
      .selectAll<SVGGElement, BarDatum>('g.bar-col')
      .data(data, (d) => d.label)
      .enter()
      .append('g')
      .attr('class', 'bar-col')
      .attr('transform', (d) => `translate(${x(d.label) ?? 0},0)`);

    cols
      .append('rect')
      .attr('class', 'chart__bar')
      .attr('x', 0)
      .attr('y', (d) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.max(1, innerH - y(d.value)))
      .attr('rx', 4)
      .attr('fill', (d) => d.color)
      .append('title')
      .text((d) => `${d.label}: ${d.formattedValue ?? d.value}`);

    cols
      .append('text')
      .attr('class', 'chart__label')
      .attr('x', x.bandwidth() / 2)
      .attr('y', innerH + 16)
      .attr('text-anchor', 'middle')
      .text((d) => d.label);
  }
}
