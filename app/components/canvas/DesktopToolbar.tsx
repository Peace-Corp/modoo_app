'use client'

import React from 'react';
import { ProductSide } from '@/types/types';
import Toolbar from './Toolbar';

interface DesktopToolbarProps {
  sides: ProductSide[];
  productId?: string;
}

const DesktopToolbar: React.FC<DesktopToolbarProps> = ({ sides, productId }) => {
  return (
    <div className="mb-4">
      <Toolbar sides={sides} variant="desktop" productId={productId} />
    </div>
  );
};

export default DesktopToolbar;

