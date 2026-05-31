import { scaleTime, scaleLinear } from 'd3-scale';
import { line as d3line, curveMonotoneX } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent as d3extent, max as d3max } from 'd3-array';
import { timeFormat } from 'd3-time-format';
import { ChartComponent, type ChartAccessibility, type ChartTableRow } from './ChartComponent';

export interface LinePoint {
  date: Date;
  value: number;
}

export interface LineChartOptions {
  data: LinePoint[];
  title: string;
  description: string;
  yLabel?: string;
  color?: string;
  formatValue?: (v: number) => string;
}

export class LineChart extends ChartComponent {
  private readonly opts: Required<Pick<LineChartOptions, 'color'>> & LineChartOptions;

  constructor(opts: LineChartOptions) {
    super();
    this.opts = { color: 'var(--color-primary, #2e7d32)', ...opts };
  }

  protected override accessibility(): ChartAccessibility {
    return { title: this.opts.title, description: this.opts.description };
  }

  protected override dataTable(): ChartTableRow[] {
    const fmt = this.opts.formatValue ?? ((v: number) => v.toFixed(2));
    const dateFmt = timeFormat('%d.%m.%Y');
    return [...this.opts.data]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((d) => ({ label: dateFmt(d.date), value: fmt(d.value) }));
  }

  protected override defaultAspectRatio(): number {
    return 16 / 7;
  }

  protected override drawChart(): void {
    const data = [...this.opts.data].sort((a, b) => a.date.getTime() - b.date.getTime());
    if (data.length === 0) {
      this.layer()
        .append('text')
        .attr('x', this.width / 2)
        .attr('y', this.height / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'chart__empty')
        .text('Няма данни за избрания период');
      return;
    }

    const padding = { top: 16, right: 24, bottom: 32, left: 56 };
    const innerW = Math.max(10, this.width - padding.left - padding.right);
    const innerH = Math.max(10, this.height - padding.top - padding.bottom);

    const [d0, d1] = d3extent(data, (d) => d.date) as [Date, Date];
    const x = scaleTime()
      .domain(d0.getTime() === d1.getTime() ? [new Date(d0.getTime() - 86_400_000), new Date(d1.getTime() + 86_400_000)] : [d0, d1])
      .range([0, innerW]);

    const yMax = Math.max(d3max(data, (d) => d.value) ?? 0, 0.0001);
    const y = scaleLinear().domain([0, yMax * 1.1]).range([innerH, 0]).nice();

    const g = this.layer().attr('transform', `translate(${padding.left},${padding.top})`);

    const formatDate = timeFormat('%d.%m');
    const xAxis = axisBottom(x).ticks(Math.min(6, data.length)).tickFormat((v) => formatDate(v as Date));
    const yAxis = axisLeft(y).ticks(4);

    g.append('g')
      .attr('class', 'chart__axis chart__axis--x')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis as never);

    g.append('g').attr('class', 'chart__axis chart__axis--y').call(yAxis as never);

    if (this.opts.yLabel) {
      g.append('text')
        .attr('class', 'chart__axis-label')
        .attr('transform', `translate(${-padding.left + 14},${innerH / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .text(this.opts.yLabel);
    }

    const lineGen = d3line<LinePoint>()
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('class', 'chart__line')
      .attr('fill', 'none')
      .attr('stroke', this.opts.color)
      .attr('stroke-width', 2)
      .attr('d', lineGen);

    const fmt = this.opts.formatValue ?? ((v: number) => v.toFixed(2));
    g.selectAll<SVGCircleElement, LinePoint>('circle.chart__point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'chart__point')
      .attr('cx', (d) => x(d.date))
      .attr('cy', (d) => y(d.value))
      .attr('r', 3.5)
      .attr('fill', this.opts.color)
      .append('title')
      .text((d) => `${formatDate(d.date)}: ${fmt(d.value)}`);
  }
}
