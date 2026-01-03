'use client'

import React, { useEffect, useMemo, useState } from 'react';
import ProductDesigner from '@/app/components/canvas/ProductDesigner';
import { ProductConfig } from '@/types/types';
import { useCanvasStore } from '@/store/useCanvasStore';

interface CoBuyDesignViewerProps {
  config: ProductConfig;
  canvasState: Record<string, string> | string;
  productColor: string;
}

/**
 * Read-only canvas viewer for CoBuy participants
 * Displays the design without edit capabilities
 */
const CoBuyDesignViewer: React.FC<CoBuyDesignViewerProps> = ({
  config,
  canvasState,
  productColor
}) => {
  const {
    setEditMode,
    setProductColor,
    setActiveSide,
    restoreAllCanvasState,
    canvasMap,
    incrementCanvasVersion
  } = useCanvasStore();
  const [hasRestored, setHasRestored] = useState(false);

  const parsedCanvasState = useMemo(() => {
    if (!canvasState) return null;
    if (typeof canvasState === 'string') {
      try {
        return JSON.parse(canvasState) as Record<string, string>;
      } catch (error) {
        console.error('Failed to parse canvas state:', error);
        return null;
      }
    }
    return canvasState as Record<string, string>;
  }, [canvasState]);

  useEffect(() => {
    // Ensure edit mode is disabled
    setEditMode(false);

    if (config?.sides?.length) {
      setActiveSide(config.sides[0].id);
    }

    // Set product color
    setProductColor(productColor || '#FFFFFF');
  }, [config?.sides, productColor, setEditMode, setProductColor, setActiveSide]);

  useEffect(() => {
    setHasRestored(false);
  }, [parsedCanvasState, config?.productId]);

  useEffect(() => {
    if (hasRestored || !parsedCanvasState) return;
    if (!config?.sides?.length) return;

    const expectedSideIds = config.sides.map((side) => side.id);
    const areCanvasesReady = expectedSideIds.every((id) => canvasMap[id]);

    if (!areCanvasesReady) return;

    const restoreDesign = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 120));
        await restoreAllCanvasState(parsedCanvasState);
        Object.values(canvasMap).forEach((canvas) => {
          canvas.requestRenderAll();
        });
        incrementCanvasVersion();
        setHasRestored(true);
      } catch (error) {
        console.error('Failed to restore CoBuy design:', error);
      }
    };

    restoreDesign();
  }, [canvasMap, config?.sides, hasRestored, incrementCanvasVersion, parsedCanvasState, restoreAllCanvasState]);

  return (
    <div className="w-full">
      <ProductDesigner
        config={config}
        layout="mobile"
      />
    </div>
  );
};

export default CoBuyDesignViewer;
