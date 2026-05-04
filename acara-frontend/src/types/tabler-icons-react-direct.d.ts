declare module '@tabler/icons-react/dist/esm/icons/*.mjs' {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface IconProps extends Partial<Omit<ComponentPropsWithoutRef<'svg'>, 'stroke'>> {
    size?: string | number;
    stroke?: string | number;
    title?: string;
  }

  export type Icon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

  const IconComponent: Icon;
  export default IconComponent;
}
