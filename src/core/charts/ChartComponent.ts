import { Component } from '@core/view/Component';
import { select, type Selection } from 'd3-selection';

export interface ChartAccessibility {
  title: string;
  description: string;
}

export abstract class ChartComponent extends Component {
  protected svg!: Selection<SVGSVGElement, unknown, null, undefined>;
  protected width = 0;
  protected height = 0;
  private resizeObserver: ResizeObserver | null = null;
  private readonly titleId = `chart-title-${Math.random().toString(36).slice(2, 9)}`;
  private readonly descId = `chart-desc-${Math.random().toString(36).slice(2, 9)}`;

  protected abstract accessibility(): ChartAccessibility;

  protected abstract drawChart(): void;

  protected defaultAspectRatio(): number {
    return 16 / 9;
  }

  protected override render(): string {
    const a11y = this.accessibility();
    return `
      <div class="chart" role="img" aria-labelledby="${this.titleId} ${this.descId}">
        <svg class="chart__svg" preserveAspectRatio="xMidYMid meet">
          <title id="${this.titleId}">${escapeText(a11y.title)}</title>
          <desc id="${this.descId}">${escapeText(a11y.description)}</desc>
        </svg>
      </div>
    `;
  }

  protected override onAfterRender(): void {
    const host = this.root.querySelector<HTMLElement>('.chart');
    const svgEl = this.root.querySelector<SVGSVGElement>('svg.chart__svg');
    if (!host || !svgEl) return;
    this.svg = select(svgEl);

    const measure = () => {
      const rect = host.getBoundingClientRect();
      this.width = Math.max(120, Math.round(rect.width));
      this.height = Math.max(80, Math.round(this.width / this.defaultAspectRatio()));
      svgEl.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
      svgEl.setAttribute('width', String(this.width));
      svgEl.setAttribute('height', String(this.height));
      this.redraw();
    };

    measure();

    this.resizeObserver = new ResizeObserver(() => measure());
    this.resizeObserver.observe(host);
    this.disposers.push(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });
  }

  redraw(): void {
    if (!this.svg) return;
    this.svg.selectAll('g.chart__layer').remove();
    this.drawChart();
  }

  protected layer(className?: string): Selection<SVGGElement, unknown, null, undefined> {
    const g = this.svg.append('g').attr('class', `chart__layer${className ? ' ' + className : ''}`);
    return g as Selection<SVGGElement, unknown, null, undefined>;
  }
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}
