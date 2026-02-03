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
    <Toolbar sides={sides} variant="desktop" productId={productId} />
  );
};

export default DesktopToolbar;

