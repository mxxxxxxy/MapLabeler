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

export type DSL = State | Geography | Trend | TextBox | Image | VegaLite;

export interface Annotation {
  id: number;
  input: string;
  dsls: DSL[];
  visible: boolean;
  group: SVGGElement;
  modality: string | null;
  time: string;
  location: string;
  source: string;
  importance: 1 | 2 | 3;
}


