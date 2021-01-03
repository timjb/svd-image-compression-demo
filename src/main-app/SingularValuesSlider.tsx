import * as React from "react";
import * as noUiSlider from "nouislider";

export interface SVSliderProps {
  value: number;
  maxSvs: number;
  max: number;
  onUpdate: (svs: number) => void;
}

export class SingularValuesSlider extends React.Component<SVSliderProps> {
  private sliderElRef: React.RefObject<HTMLDivElement>;
  constructor(props: SVSliderProps) {
    super(props);
    this.sliderElRef = React.createRef();
  }
  render(): JSX.Element {
    return <div ref={this.sliderElRef} className="slider" />;
  }
  private getNoUiSlider(): noUiSlider.noUiSlider | undefined {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const instance = (this.sliderElRef.current! as HTMLElement) as noUiSlider.Instance;
    return instance.noUiSlider;
  }
  componentDidUpdate(prevProps: SVSliderProps): void {
    const slider = this.getNoUiSlider();
    if (!slider) {
      return;
    }
    if (this.props.value !== SingularValuesSlider.getSliderValue(slider)) {
      // hacky
      slider.set(this.props.value);
    }
    if (this.props.maxSvs !== prevProps.maxSvs) {
      slider.destroy();
      this.buildSlider();
    }
  }
  componentDidMount(): void {
    this.buildSlider();
  }
  private static getSliderValue(noUiSlider: noUiSlider.noUiSlider): number {
    return Math.round(parseInt(noUiSlider.get() as string, 10));
  }
  private buildSlider(): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sliderEl = this.sliderElRef.current! as HTMLElement;
    noUiSlider.create(sliderEl, this.getSliderOptions());
    const slider = (sliderEl as noUiSlider.Instance).noUiSlider;
    const getSliderValue = (): number => SingularValuesSlider.getSliderValue(slider);
    slider.on("update", () => {
      const val = getSliderValue();
      if (val !== this.props.value) {
        if (this.props.onUpdate) {
          this.props.onUpdate(val);
        }
      }
    });
  }
  private getSliderOptions(): noUiSlider.Options {
    const maxVal = this.props.max;
    const maxSvs = this.props.maxSvs;
    const values: number[] = [];
    for (let i = 1; i < 20; i++) {
      values.push(i);
    }
    for (let i = 20; i < 100; i += 5) {
      values.push(i);
    }
    for (let i = 100; i < maxVal; i += 10) {
      values.push(i);
    }
    values.push(maxVal);
    return {
      // TODO: adapt to image size
      behaviour: "snap",
      range: {
        min: [1, 1],
        "18%": [10, 2],
        "30%": [20, 10],
        "48%": [100, 20],
        max: [maxVal],
      },
      start: this.props.value,
      pips: {
        mode: "values",
        values: values,
        density: 10,
        filter: (v: number): number => {
          if (v > maxSvs) {
            return 0;
          }
          if (v === 1 || v === 10 || v === 20) {
            return 1;
          }
          if (v % 100 === 0) {
            return 1;
          }
          if (v < 10) {
            return 2;
          }
          if (v < 20 && v % 2 === 0) {
            return 2;
          }
          if (v < 100 && v % 10 === 0) {
            return 2;
          }
          if (v % 20 === 0) {
            return 2;
          }
          return 0;
        },
      },
    };
  }
}
