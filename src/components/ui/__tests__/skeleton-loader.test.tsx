import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Skeleton,
  MenuItemSkeleton,
  TableSkeleton,
  StatsSkeleton,
  OrderItemSkeleton,
  CustomerRowSkeleton
} from '../skeleton-loader';
describe('Skeleton Components', () => {
  describe('Base Skeleton', () => {
    it('renders with default classes', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('bg-muted');
    });

    it('accepts custom className', () => {
      const { container } = render(<Skeleton className="h-10 w-20" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-10');
      expect(skeleton).toHaveClass('w-20');
    });
  });

  describe('MenuItemSkeleton', () => {
    it('renders menu item skeleton structure', () => {
      const { container } = render(<MenuItemSkeleton />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      // Should have image skeleton and text skeletons
      expect(skeletons.length).toBeGreaterThan(1);
    });
  });

  describe('TableSkeleton', () => {
    it('renders correct number of rows and columns', () => {
      const { container } = render(<TableSkeleton rows={3} cols={4} />);
      
      // Check header row
      const header = container.querySelector('.flex.border-b');
      expect(header).toBeInTheDocument();
      const headerCells = header?.querySelectorAll('.animate-pulse');
      expect(headerCells).toHaveLength(4);
      
      // Check data rows (should be 3)
      const rows = container.querySelectorAll('.flex.py-3.border-b');
      expect(rows).toHaveLength(3);
    });

    it('uses default values when props not provided', () => {
      const { container } = render(<TableSkeleton />);
      
      // Default is 5 rows
      const rows = container.querySelectorAll('.flex.py-3.border-b');
      expect(rows).toHaveLength(5);
      
      // Default is 4 columns
      const firstRow = rows[0];
      const cells = firstRow.querySelectorAll('.animate-pulse');
      expect(cells).toHaveLength(4);
    });
  });

  describe('StatsSkeleton', () => {
    it('renders 4 stat cards', () => {
      const { container } = render(<StatsSkeleton />);
      const cards = container.querySelectorAll('.p-6.border.rounded-lg');
      expect(cards).toHaveLength(4);
    });
  });

  describe('OrderItemSkeleton', () => {
    it('renders order item structure', () => {
      const { container } = render(<OrderItemSkeleton />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      // Should have avatar, text items, and action button skeletons
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('CustomerRowSkeleton', () => {
    it('renders customer row with avatar and actions', () => {
      const { container } = render(<CustomerRowSkeleton />);
      
      // Should have rounded avatar
      const avatar = container.querySelector('.rounded-full.animate-pulse');
      expect(avatar).toBeInTheDocument();
      
      // Should have action buttons
      const buttons = container.querySelectorAll('.h-8.w-8.rounded.animate-pulse');
      expect(buttons).toHaveLength(2);
    });
  });
});