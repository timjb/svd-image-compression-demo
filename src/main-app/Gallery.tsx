import * as React from "react";
import Slider from "react-slick";

const preload: (src: string) => void = ((): ((src: string) => void) => {
  const preloaded: { [src: string]: boolean } = {};

  return (src: string): void => {
    if (preloaded[src]) {
      return;
    }
    const img = new Image();
    img.onload = (): void => {
      preloaded[src] = true;
      console.log("Preloaded image '" + src + "'");
    };
    img.src = src;
  };
})();

interface GalleryImageDesc {
  name?: string;
  caption: string;
  source: string;
  preview?: string;
  url?: string;
  quiz?: boolean;
}

export interface FullGalleryImageDesc extends GalleryImageDesc {
  preview: string;
  quiz: boolean;
  width: number;
  height: number;
  url: string;
}

export interface GalleryProps {
  onClick: (imgDesc: FullGalleryImageDesc) => void;
  onScroll: (imgNum: number) => void;
}

export class Gallery extends React.Component<GalleryProps, {}> {
  getImages(): FullGalleryImageDesc[] {
    function quiz(obj: GalleryImageDesc): GalleryImageDesc {
      obj.preview = "images/question_mark_small.jpg";
      obj.quiz = true;
      return obj;
    }
    return [
      {
        name: "cats",
        caption: "By Jetske",
        source: "https://www.flickr.com/photos/jetske/5827857531/",
      },
      {
        name: "tree",
        caption: "By Moyan Brenn",
        source: "https://www.flickr.com/photos/aigle_dore/15061080128/",
      },
      {
        name: "mondrian",
        caption: "By Rael Garcia Arnes",
        source: "https://www.flickr.com/photos/raelga/4408707212/",
      },
      {
        name: "nyc",
        caption: "By Chris Isherwood",
        source: "https://www.flickr.com/photos/isherwoodchris/3096255994/",
      },
      {
        name: "girl",
        caption: "By Elvin",
        source: "https://www.flickr.com/photos/25228175@N08/5896000539/",
      },
      {
        name: "royal_stewart",
        caption: "The Royal Stewart tartan",
        source: "https://en.wikipedia.org/wiki/Royal_Stewart_tartan",
      },
      {
        url: "images/randbitmap-rdo_medium.png",
        preview: "images/randbitmap-rdo_small.png",
        caption: "Random data",
        source: "https://www.random.org/bitmaps/",
      },
      {
        name: "girih_pattern",
        caption: "Girih pattern by İnfoCan",
        source:
          "https://en.wikipedia.org/wiki/Girih#/media/File:Samarkand_Shah-i_Zinda_Tuman_Aqa_complex_cropped2.jpg",
      },
      {
        caption: "Made with the KC-O-M",
        url: "images/keep-calm-and-use-svd_medium.png",
        preview: "images/keep-calm-and-use-svd_small.png",
        source: "http://www.keepcalm-o-matic.co.uk/",
      },
      {
        name: "skater_boy",
        caption: "By Chris Goldberg",
        source: "https://flic.kr/p/keMZvg",
      },
      quiz({
        // Taj Mahal
        name: "quiz1",
        caption: "By Francisco Martins",
        source: "https://flic.kr/p/4bpEpb",
      }),
      quiz({
        // Rubik's Cube
        name: "quiz2",
        caption: "By Eleonora Gorini",
        source: "https://flic.kr/p/5yWPDc",
      }),
      quiz({
        // Airplane
        name: "quiz3",
        caption: "By melfoody",
        source: "https://flic.kr/p/enTNR5",
      }),
      quiz({
        // The Starry Night
        name: "quiz4",
        caption: "By VvG",
        source: "https://goo.gl/oH2BLt",
      }),
      quiz({
        // indian_peafowl
        name: "quiz5",
        caption: "By Sergiu Bacioiu",
        source: "https://flic.kr/p/7TdBUA",
      }),
    ].map((obj: GalleryImageDesc, i: number) => {
      return {
        name: obj.name ?? "image-" + i,
        width: 150,
        height: 150,
        url: obj.url ?? "images/" + obj.name + "_medium.jpg",
        preview: obj.preview ?? "images/" + obj.name + "_small.jpg",
        caption: obj.caption,
        source: obj.source,
        quiz: !!obj.quiz,
      };
    });
  }
  renderImage(img: FullGalleryImageDesc): JSX.Element {
    const onClick = (evt: React.MouseEvent<HTMLElement>): void => {
      evt.preventDefault();
      if (this.props.onClick) {
        this.props.onClick(img);
      }
    };
    const onMouseOver = (): void => {
      preload(img.url);
    };
    return (
      <div className="image" key={img.name}>
        <a href={img.url} onClick={onClick} onMouseOver={onMouseOver}>
          <img width={img.width} height={img.height} src={img.preview} />
        </a>
        <p className="caption">
          <a href={img.source}>{img.caption}</a>
        </p>
      </div>
    );
  }
  render(): JSX.Element {
    return (
      <Slider
        className="gallery"
        slidesToShow={5}
        slidesToScroll={5}
        draggable={false}
        infinite={false}
        afterChange={this.props.onScroll}
      >
        {this.getImages().map(this.renderImage.bind(this))}
      </Slider>
    );
  }
}
