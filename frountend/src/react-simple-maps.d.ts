declare module "react-simple-maps" {
  import { FC, ReactNode, SVGProps } from "react";

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    style?: React.CSSProperties;
    children?: ReactNode;
    [key: string]: unknown;
  }

  interface GeographiesProps {
    geography: string | object;
    children: (args: { geographies: object[] }) => ReactNode;
  }

  interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: object;
    [key: string]: unknown;
  }

  interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
    [key: string]: unknown;
  }

  interface GraticuleProps {
    stroke?: string;
    strokeWidth?: number;
    [key: string]: unknown;
  }

  export const ComposableMap: FC<ComposableMapProps>;
  export const Geographies: FC<GeographiesProps>;
  export const Geography: FC<GeographyProps>;
  export const Marker: FC<MarkerProps>;
  export const Graticule: FC<GraticuleProps>;
}
