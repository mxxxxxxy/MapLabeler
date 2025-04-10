import { VisualizationSpec } from "vega-embed";

export interface State {
  type: "State";
  paras: {
    target: string; // Name of entity in the input
  };
}

export interface Geography {
  type: "Geography";
  paras: {
    target_1: string; // Name of referred entity
    target_2: string; // Name of current entity
    direction: "东" | "南" | "西" | "北" | ""; // Direction
    distance: string; // Distance between entity 1 and entity 2, can be empty string
  };
}

export interface Trend {
  type: "Trend";
  paras: {
    target_1: string; // Name of entity 1
    target_2: string; // Name of entity 2
    info: string; // Information about the trend
  };
}

export interface TextBox {
  type: "TextBox";
  paras: {
    target: string; // Name of entity to be annotated
    text: string; // Text to be displayed
  };
}

export interface Image {
  type: "Image";
  paras: {
    lat: number;
    lon: number;
    imageUrl: string;
  };
}

export interface VegaLite {
  type: "VegaLite";
  paras: {
    target: string;
    title: string;
    spec: VisualizationSpec;
  };
}
interface Coords {
  x: number;
  y: number;
}

export interface AttrPoint {
  type: "Point";
  paras: {
    id: number;
    coord: Coords;
  };
}

export interface AttrLine {
  type: "Line";
  paras: {
    id: number;
    coords: Coords[];
  };
}

export interface AttrArea {
  type: "Area";
  paras: {
    id: number;
    // items: string[];
    // attr: VisualizationSpec;
  };
}

export interface LogicSet {
  type: "Set";
  paras: {
    id: number;
    items: string[];
    attr: VisualizationSpec;
  };
}

export interface LogicSequence {
  type: "Sequence";
  paras: {
    id: number;
    items: string[];
    attr: VisualizationSpec;
  };
}

export type DSL = State | Geography | Trend | TextBox | Image | VegaLite;
export type LabelDSL = LogicSet | LogicSequence;
export type mouseMode = "default" | "logic" | "entity";

// MapTracer原始
export interface EntityAnnotation {
  id: number;
  usrId: number;
  dsls: DSL[];
  visible: boolean;
  group: SVGGElement;
  modality: string | null;
  time: string;
  location: string;
  source: string;
  importance: 1 | 2 | 3;
}

export interface LogicAnnotation {
  id: number;
  usrId: number;
  dsls: LabelDSL[];
  // visible: boolean;
  // group: SVGGElement;
  // modality: string | null;
  // time: string;
  // location: string;
  // source: string;
  // importance: 1 | 2 | 3;
}

export interface User {
  id: number;
  // input: string;
  // dsls: DSL[];
  // visible: boolean;
  // group: SVGGElement;
  // modality: string | null;
  // time: string;
  // location: string;
  // source: string;
  // importance: 1 | 2 | 3;
}



