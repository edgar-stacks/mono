import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';

interface SplineCanvasProps {
  scene: string;
  wasmPath: string;
  onLoad(application: Application): void;
}

export function SplineCanvas({ scene, wasmPath, onLoad }: SplineCanvasProps) {
  return (
    <Spline
      scene={scene}
      wasmPath={wasmPath}
      onLoad={onLoad}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
