import * as React from "react";
import * as noUiSlider from "nouislider";

// Copied from underscore.js (https://github.com/jashkenas/underscore)
//
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func: () => void, wait: number, immediate = false): () => void {
  const getNow = Date.now || ((): number => new Date().getTime());

  let timeout: null | ReturnType<typeof setTimeout>, timestamp: number;

  const later = (): void => {
    const last = getNow() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        func();
      }
    }
  };

  return (): void => {
    timestamp = getNow();
    const callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      func();
    }
  };
}

export interface SVSliderProps {
  value: number;
  maxSvs: number;
  max: number;
  onUpdate: (svs: number) => void;
  onChange: (svs: number) => void;
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
    slider.on(
      "update",
      debounce(() => {
        const val = getSliderValue();
        if (val !== this.props.value) {
          if (this.props.onUpdate) {
            this.props.onUpdate(val);
          }
        }
      }, 50),
    );
    slider.on(
      "change",
      debounce(() => {
        const val = getSliderValue();
        if (val !== this.props.value) {
          if (this.props.onChange) {
            this.props.onChange(val);
          }
        }
      }, 50),
    );
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
