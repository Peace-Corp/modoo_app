'use client'

import React from 'react';
import { ProductSide } from '@/types/types';
import Toolbar from './Toolbar';

interface DesktopToolbarProps {
  sides: ProductSide[];
}

const DesktopToolbar: React.FC<DesktopToolbarProps> = ({ sides }) => {
  return (
    <div className="mb-4">
      <Toolbar sides={sides} variant="desktop" />
    </div>
  );
};

export default DesktopToolbar;

