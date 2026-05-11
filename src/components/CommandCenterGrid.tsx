"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  CalendarRange, 
  Wrench, 
  LayoutGrid, 
  ChevronRight,
  GripHorizontal,
  Package
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type NavItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  iconName: string;
};

const iconMap: Record<string, React.ElementType> = {
  CalendarRange,
  Wrench,
  LayoutGrid,
  Package,
};

function SortableItem({ item }: { item: NavItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  const Icon = iconMap[item.iconName] || LayoutGrid;

  const colorMap: Record<string, { bg: string, border: string, hover: string }> = {
    CalendarRange: { bg: 'bg-[#e6f0ff]', border: 'border-[#c2d6ff]', hover: 'group-hover:bg-[#ccdfff]' }, // Soft Blue
    Wrench: { bg: 'bg-[#e6faed]', border: 'border-[#bbf2ce]', hover: 'group-hover:bg-[#ccf2d9]' }, // Pale Mint
    LayoutGrid: { bg: 'bg-[#fff0e6]', border: 'border-[#ffd8c2]', hover: 'group-hover:bg-[#ffe5d4]' }, // Light Peach
    Package: { bg: 'bg-[#f3e8ff]', border: 'border-[#d8b4fe]', hover: 'group-hover:bg-[#e9d5ff]' } // Soft Purple
  };

  const colors = colorMap[item.iconName] || { bg: 'bg-white', border: 'border-gray-200', hover: 'group-hover:bg-gray-50' };

  return (
    <div ref={setNodeRef} style={style} className={`group relative flex flex-col ${colors.bg} border ${colors.border} shadow-sm transition-all duration-300 ${isDragging ? 'shadow-xl' : 'hover:shadow-md hover:-translate-y-1'} overflow-hidden rounded-xl`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-black/5 group-hover:bg-[#1a1a1a] transition-colors duration-300" />
      
      {/* Drag Handle */}
      <div 
        className="absolute top-3 right-3 p-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
      >
        <GripHorizontal className="w-5 h-5" />
      </div>

      <Link
        href={item.href}
        className="flex-1 flex flex-col p-8 min-h-[44px] min-w-[44px]"
      >
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 bg-white/60 ${colors.hover} transition-colors duration-300 rounded-lg`}>
            <Icon className="w-8 h-8 text-[#1a1a1a]" strokeWidth={1.5} />
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#1a1a1a] transition-colors duration-300 transform group-hover:translate-x-1" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-lg font-normal text-[#1a1a1a] tracking-wide mb-2">
            {item.title}
          </h2>
          <p className="text-sm font-normal text-gray-700 line-clamp-2">
            {item.description}
          </p>
        </div>
      </Link>
    </div>
  );
}

export default function CommandCenterGrid({ initialItems }: { initialItems: NavItem[] }) {
  const [items, setItems] = useState<NavItem[]>(initialItems);
  const [isMounted, setIsMounted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before dragging starts (allows clicks on links)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const savedOrder = localStorage.getItem('command-center-order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        if (Array.isArray(orderIds) && orderIds.length === initialItems.length) {
          const reorderedItems = orderIds
            .map(id => initialItems.find(item => item.id === id))
            .filter(Boolean) as NavItem[];
          
          if (reorderedItems.length === initialItems.length) {
            setItems(reorderedItems);
          }
        }
      } catch (e) {
        console.error('Failed to parse saved order', e);
      }
    }
  }, [initialItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('command-center-order', JSON.stringify(newItems.map(i => i.id)));
        return newItems;
      });
    }
  };

  // Prevent hydration mismatch by not rendering drag elements until mounted
  if (!isMounted) {
    return (
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {initialItems.map((item) => (
          <div key={item.id} className="min-h-[200px] bg-white border border-gray-200 shadow-sm p-8" />
        ))}
      </main>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={items.map(i => i.id)}
        strategy={rectSortingStrategy}
      >
        <main className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {items.map(item => (
            <SortableItem key={item.id} item={item} />
          ))}
        </main>
      </SortableContext>
    </DndContext>
  );
}
