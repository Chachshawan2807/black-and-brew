'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, GripVertical, Undo2, Redo2, Trash2, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  order_qty: number;
  order_point: number;
  target_stock: number;
  unit: string;
  source: string;
  sort_order: number;
  [key: string]: any;
}

interface ColumnDef {
  id: string;
  label: string;
  width: string;
  type: 'text' | 'number';
}

const defaultColumns: ColumnDef[] = [
  { id: 'name', label: 'ชื่อรายการ', width: '220px', type: 'text' },
  { id: 'stock', label: 'คงเหลือ', width: '80px', type: 'number' },
  { id: 'order_qty', label: 'จำนวนสั่งซื้อ', width: '100px', type: 'number' },
  { id: 'order_point', label: 'จุดสั่งซื้อ', width: '100px', type: 'number' },
  { id: 'target_stock', label: 'จำนวนที่ต้องมี', width: '120px', type: 'number' },
  { id: 'unit', label: 'หน่วย', width: '80px', type: 'text' },
  { id: 'source', label: 'ช่องทางสั่งซื้อ', width: '160px', type: 'text' },
];

function ColumnHeader({ col, updateColumnLabel, saveColumnsConfig, onResize }: { 
  col: ColumnDef; 
  updateColumnLabel: (id: string, label: string) => void;
  saveColumnsConfig: () => void;
  onResize: (id: string, width: number) => void;
}) {
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.pageX;
    startWidth.current = parseInt(col.width) || 150;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = moveEvent.pageX - startX.current;
      const newWidth = Math.max(80, startWidth.current + delta);
      onResize(col.id, newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      saveColumnsConfig();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const style = {
    width: col.width,
    minWidth: col.width === 'auto' ? '80px' : col.width,
  };

  return (
    <th
      style={style}
      className={`p-0 font-normal ${col.id === 'source' ? '' : 'border-r border-[#000000]/5'} group relative select-none bg-transparent`}
    >
      <div className="p-3 flex items-center justify-center">
        <input 
          type="text"
          value={col.label}
          onChange={(e) => updateColumnLabel(col.id, e.target.value)}
          onBlur={saveColumnsConfig}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          onPointerDown={(e) => e.stopPropagation()}
          className="bg-transparent border-none focus:outline-none focus:bg-white/50 text-[13px] font-normal text-[#000000] cursor-text px-1 rounded-md text-center whitespace-nowrap overflow-hidden text-ellipsis w-full"
        />
      </div>
      {/* Resizer Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-purple-300 transition-colors z-20 ${col.id === 'source' ? '' : 'border-r border-slate-100'}`}
      />
    </th>
  );
}

function SortableRow({ item, columns, handleUpdateField, handleSaveField, requestDelete, handleFocus }: { 
  item: InventoryItem; 
  columns: ColumnDef[];
  handleUpdateField: (id: string, field: string, value: any) => void;
  handleSaveField: (id: string, field: string, value: any) => void;
  requestDelete: (id: string) => void;
  handleFocus: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-[#000000]/5 hover:bg-[#000000]/5 transition-colors group"
    >
      <td className="w-10 min-w-[40px] border-r border-[#000000]/5 p-0 text-center align-middle">
        <div 
          className="flex items-center justify-center h-full min-h-[44px] cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 opacity-50 group-hover:opacity-100" />
        </div>
      </td>

      {columns.map((col, index) => (
        <td 
          key={col.id} 
          style={{ width: col.width, minWidth: col.id === 'name' ? '240px' : col.width }} 
          className={`p-0 border-r border-[#000000]/5 relative group/cell ${index === columns.length - 1 ? 'border-r-0' : ''}`}
        >
          <EditableCell 
            item={item} 
            col={col} 
            handleUpdateField={handleUpdateField} 
            handleSaveField={handleSaveField} 
            requestDelete={requestDelete} 
            handleFocus={handleFocus} 
          />
        </td>
      ))}
    </tr>
  );
}

function EditableCell({ item, col, handleUpdateField, handleSaveField, requestDelete, handleFocus }: any) {
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Sync with global state when not focused
  useEffect(() => {
    if (!isFocused) {
      const val = item[col.id];
      // Idle 0 = Hidden: 0 or empty shows as "" when not focused
      setLocalValue(val === 0 || val === '' || val === null || val === undefined ? '' : String(val));
    }
  }, [item[col.id], isFocused, col.id]);

  return (
    <div className="flex items-center relative h-full">
      <input 
        type="text"
        inputMode={col.type === 'number' ? 'decimal' : 'text'}
        value={localValue}
        onFocus={() => {
          setIsFocused(true);
          handleFocus();
        }}
        onChange={(e) => {
          // Absolute String-First Strategy: set value directly to allow "0", "00", etc.
          setLocalValue(e.target.value);
        }}
        onBlur={() => {
          setIsFocused(false);
          let finalVal: string | number = localValue;
          
          if (col.type === 'number') {
            const numericValue = localValue === "" ? 0 : Number(localValue);
            finalVal = isNaN(numericValue) ? 0 : numericValue;
          }

          // Force explicitly save, as requested
          handleUpdateField(item.id, col.id, finalVal);
          handleSaveField(item.id, col.id, finalVal);
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`w-full px-2 py-3 bg-transparent border-none focus:outline-none focus:bg-[#fdfcf0]/50 text-[14px] font-normal text-[#000000] ${col.id === 'name' ? 'text-left pr-8' : 'text-center'} ${col.type === 'number' ? 'font-mono' : ''}`}
      />
      {col.id === 'name' && (
        <button 
          onClick={() => requestDelete(item.id)}
          className="absolute right-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/cell:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function DynamicInventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  
  // Add Form State
  const [newItemData, setNewItemData] = useState<Partial<InventoryItem>>({});

  // History State
  const [undoStack, setUndoStack] = useState<{items: InventoryItem[], cols: ColumnDef[]}[]>([]);
  const [redoStack, setRedoStack] = useState<{items: InventoryItem[], cols: ColumnDef[]}[]>([]);
  const previousStateRef = useRef<{items: InventoryItem[], cols: ColumnDef[]}>({ items: [], cols: defaultColumns });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchConfigAndInventory();

    const channel = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => {
            if (prev.find(i => i.id === payload.new.id)) return prev;
            return [...prev, payload.new as InventoryItem];
          });
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(item => item.id === payload.new.id ? payload.new as InventoryItem : item).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    previousStateRef.current = { items, cols: columns };
  }, [items, columns]);

  async function fetchConfigAndInventory() {
    try {
      const [configRes, inventoryRes] = await Promise.all([
        supabase.from('inventory_config').select('settings').eq('id', 'column_labels').single(),
        supabase.from('inventory_items').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true })
      ]);

      if (inventoryRes.error) {
        console.error('Supabase Error (Fetch):', inventoryRes.error.message, inventoryRes.error.details);
        throw inventoryRes.error;
      }
      
      const loadedItems = inventoryRes.data || [];
      setItems(loadedItems);

      let loadedCols = defaultColumns;
      if (configRes.data && configRes.data.settings) {
        const settings = configRes.data.settings;
        if (settings.order && settings.labels) {
           const newCols = settings.order.map((id: string) => {
              const def = defaultColumns.find(c => c.id === id);
              return def ? { ...def, label: settings.labels[id] || def.label } : null;
           }).filter(Boolean) as ColumnDef[];
           if (newCols.length > 0) {
             loadedCols = newCols;
             setColumns(newCols);
           }
        }
      }
      
      previousStateRef.current = { items: loadedItems, cols: loadedCols };
    } catch (err: any) {
      console.error('Failed to fetch inventory:', err.message || err);
    } finally {
      setLoading(false);
    }
  }

  function sanitizeInventoryItem(item: InventoryItem) {
    const sanitized = { ...item };
    const numericFields = ['stock', 'order_qty', 'order_point', 'target_stock'];
    
    numericFields.forEach(field => {
      if (sanitized[field] === '' || sanitized[field] === null || sanitized[field] === undefined || isNaN(Number(sanitized[field]))) {
        sanitized[field] = 0;
      } else {
        sanitized[field] = Number(sanitized[field]);
      }
    });

    delete sanitized.updated_at;
    return sanitized;
  }

  function pushHistory() {
    setUndoStack(prev => [...prev, previousStateRef.current]);
    setRedoStack([]);
  }

  async function handleAddItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushHistory();
    
    const newItem = {
      name: newItemData.name || '',
      stock: Number(newItemData.stock) || 0,
      order_qty: Number(newItemData.order_qty) || 0,
      order_point: Number(newItemData.order_point) || 0,
      target_stock: Number(newItemData.target_stock) || 0,
      unit: newItemData.unit || '',
      source: newItemData.source || '',
      sort_order: items.length
    };

    const tempId = crypto.randomUUID();
    setItems(prev => [...prev, { ...newItem, id: tempId }]);
    setShowAddModal(false);
    setNewItemData({});

    try {
      setSavingState('saving');
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([newItem])
        .select()
        .single();
        
      if (error) throw error;
      setItems(prev => prev.map(item => item.id === tempId ? data : item));
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Failed to add item:', err.message || err);
      setItems(prev => prev.filter(item => item.id !== tempId));
      setSavingState('idle');
    }
  }

  async function executeDelete() {
    if (!deleteId) return;
    pushHistory();
    setItems(prev => prev.filter(item => item.id !== deleteId));
    setDeleteId(null);
    
    try {
      setSavingState('saving');
      const { error } = await supabase.from('inventory_items').delete().eq('id', deleteId);
      if (error) throw error;
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Supabase Error (Delete):', err.message || err);
      fetchConfigAndInventory();
    }
  }

  function handleFocus() {
    if (!isEditing) {
      setIsEditing(true);
    }
  }

  function handleUpdateField(id: string, field: string, value: any) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  async function handleSaveField(id: string, field: string, value: any) {
    setIsEditing(false);
    const original = previousStateRef.current.items.find(i => i.id === id);
    
    // Explicitly bypass the early return if the user specifically typed a numeric value to force a sync validation
    if (original && original[field] === value && value !== 0 && value !== "") return;

    pushHistory();
    setSavingState('saving');
    let sanitizedValue = value;
    const numericFields = ['stock', 'order_qty', 'order_point', 'target_stock'];
    if (numericFields.includes(field)) {
      sanitizedValue = value === '' || value === null || value === undefined ? 0 : Number(value);
      if (isNaN(sanitizedValue as number)) sanitizedValue = 0;
    }

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ [field]: sanitizedValue })
        .eq('id', id);
        
      if (error) throw error;
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error(`Failed to update ${field}:`, err.message || err);
      setSavingState('idle');
      fetchConfigAndInventory();
    }
  }

  function updateColumnLabel(id: string, label: string) {
    setColumns(prev => prev.map(col => col.id === id ? { ...col, label } : col));
  }

  async function saveColumnsConfig(currentCols: ColumnDef[] = columns) {
    setSavingState('saving');
    const settings = {
      order: currentCols.map(c => c.id),
      labels: currentCols.reduce((acc, c) => ({...acc, [c.id]: c.label}), {})
    };
    try {
      const { error } = await supabase.from('inventory_config').upsert({ id: 'column_labels', settings });
      if (error) throw error;
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Failed to save columns config:', err.message || err);
      setSavingState('idle');
    }
  }

  function handleColumnResize(id: string, width: number) {
    setColumns(prev => prev.map(col => col.id === id ? { ...col, width: `${width}px` } : col));
  }

  async function handleDragStartRows(event: any) {
    setActiveRowId(event.active.id);
  }

  async function handleDragEndRows(event: DragEndEvent) {
    setActiveRowId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    pushHistory();
    setItems((prevItems) => {
      const oldIndex = prevItems.findIndex((i) => i.id === active.id);
      const newIndex = prevItems.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(prevItems, oldIndex, newIndex);
      const updatedItems = newItems.map((item, index) => ({ ...item, sort_order: index }));

      Promise.all(updatedItems.map((item) => 
        supabase.from('inventory_items').update({ sort_order: item.sort_order }).eq('id', item.id)
      )).then(() => {
        setSavingState('synced');
        setTimeout(() => setSavingState('idle'), 2000);
      }).catch(err => {
         console.error('Supabase Error (Reorder):', err);
         fetchConfigAndInventory(); 
      });

      setSavingState('saving');
      return updatedItems;
    });
  }

  async function syncFullStateToDB(currentItems: InventoryItem[], currentCols: ColumnDef[]) {
    setSavingState('saving');
    setIsSyncing(true);
    try {
      const sanitizedItems = currentItems.map((item, index) => sanitizeInventoryItem({ ...item, sort_order: index }));
      if (sanitizedItems.length > 0) {
        const { error: upsertErr } = await supabase.from('inventory_items').upsert(sanitizedItems);
        if (upsertErr) throw upsertErr;
      }
      
      const { data: dbItems } = await supabase.from('inventory_items').select('id');
      if (dbItems) {
         const snapshotIds = sanitizedItems.map(i => i.id);
         const toDelete = dbItems.filter(dbI => !snapshotIds.includes(dbI.id)).map(i => i.id);
         if (toDelete.length > 0) {
            await supabase.from('inventory_items').delete().in('id', toDelete);
         }
      }

      const settings = {
        order: currentCols.map(c => c.id),
        labels: currentCols.reduce((acc, c) => ({...acc, [c.id]: c.label}), {})
      };
      await supabase.from('inventory_config').upsert({ id: 'column_labels', settings });

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Error syncing undo/redo:', err.message || err);
      setSavingState('idle');
      fetchConfigAndInventory(); 
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleUndo() {
    if (undoStack.length === 0 || isSyncing) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, previousStateRef.current]);
    setItems(lastState.items);
    setColumns(lastState.cols);
    await syncFullStateToDB(lastState.items, lastState.cols);
  }

  async function handleRedo() {
    if (redoStack.length === 0 || isSyncing) return;
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, previousStateRef.current]);
    setItems(nextState.items);
    setColumns(nextState.cols);
    await syncFullStateToDB(nextState.items, nextState.cols);
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-transparent text-[#000000]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#000000]/20" strokeWidth={1.5} />
        <span className="font-normal text-sm uppercase tracking-widest text-[#000000]/40">Synchronizing...</span>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 w-full max-w-full overflow-y-auto bg-transparent text-[#000000] font-normal transition-all duration-300 flex flex-col items-start p-4 md:p-8">
      <div className="w-fit mx-auto flex flex-col items-start">
        <div className="w-full flex flex-col items-center mb-8 text-center">
          <h1 className="text-3xl font-normal tracking-tight text-slate-800">คลังสินค้า</h1>
          <p className="text-sm font-normal mt-1 text-slate-500">Dynamic UI & Time-Travel Sync</p>
        </div>
        
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div className="flex items-center gap-1.5 text-xs font-normal min-w-[70px]">
            {savingState === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span className="text-slate-500">Saving...</span>
              </>
            )}
            {savingState === 'synced' && (
              <span className="text-emerald-500">✓ Synced</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 border-r border-slate-200 pr-4 mr-2">
              <button 
                onClick={handleUndo}
                disabled={undoStack.length === 0 || isSyncing}
                className={`p-2.5 rounded-3xl transition-all ${
                  undoStack.length === 0 || isSyncing 
                  ? 'text-[#94a3b8] cursor-default' 
                  : 'text-[#000000] hover:bg-purple-100'
                }`}
                title="ย้อนกลับ (Undo)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRedo}
                disabled={redoStack.length === 0 || isSyncing}
                className={`p-2.5 rounded-3xl transition-all ${
                  redoStack.length === 0 || isSyncing 
                  ? 'text-[#94a3b8] cursor-default' 
                  : 'text-[#000000] hover:bg-purple-100'
                }`}
                title="ทำซ้ำ (Redo)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-purple-100 border border-slate-100 rounded-3xl shadow-sm transition-all text-[14px] font-normal text-[#000000]"
            >
              <Plus className="w-4 h-4 text-purple-600" />
              เพิ่มรายการ
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto flex flex-col pb-8">
          <div className="w-fit border border-[#000000]/5 bg-[#fdfcf0]/80 backdrop-blur-md shadow-sm rounded-3xl overflow-hidden mx-auto">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragStart={handleDragStartRows}
              onDragEnd={handleDragEndRows}
            >
              <table className="table-auto border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="w-10 min-w-[40px] border-r border-slate-100"></th>
                    {columns.map(col => (
                      <ColumnHeader 
                        key={col.id} 
                        col={col} 
                        updateColumnLabel={updateColumnLabel}
                        saveColumnsConfig={() => saveColumnsConfig(columns)}
                        onResize={handleColumnResize}
                      />
                    ))}
                  </tr>
                </thead>
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="p-12 text-center text-[14px] font-normal text-slate-400">
                          ไม่มีข้อมูลสินค้าในระบบ กรุณกด "เพิ่มรายการ"
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <SortableRow 
                          key={item.id} 
                          item={item} 
                          columns={columns} 
                          handleUpdateField={handleUpdateField}
                          handleSaveField={handleSaveField}
                          requestDelete={setDeleteId}
                          handleFocus={handleFocus}
                        />
                      ))
                    )}
                  </tbody>
                </SortableContext>
              </table>
              
              <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: '0.4',
                    },
                  },
                }),
              }}>
                {activeRowId ? (
                  <table className="w-full border-collapse">
                    <tbody className="bg-white/90 backdrop-blur-md shadow-2xl border border-purple-200 rounded-3xl overflow-hidden opacity-90">
                       <SortableRow 
                         item={items.find(i => i.id === activeRowId)!}
                         columns={columns}
                         handleUpdateField={() => {}}
                         handleSaveField={() => {}}
                         requestDelete={() => {}}
                         handleFocus={() => {}}
                       />
                    </tbody>
                  </table>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </div>

    {/* Add Modal */}
    {showAddModal && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
        onClick={() => setShowAddModal(false)}
      >
        <div 
          className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-normal text-[#000000]">เพิ่มรายการใหม่</h2>
            <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-[#000000] hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAddItemSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[12px] font-normal text-slate-600 ml-1">ชื่อรายการ</label>
                <input 
                  required
                  value={newItemData.name || ''}
                  onChange={e => setNewItemData(prev => ({...prev, name: e.target.value}))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 focus:border-purple-300 focus:ring-2 focus:ring-purple-100 rounded-3xl text-[14px] font-normal text-[#000000] outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-normal text-slate-600 ml-1">คงเหลือ</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={newItemData.stock === null || newItemData.stock === undefined ? '' : newItemData.stock}
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                    setNewItemData(prev => ({...prev, stock: val}));
                  }}
                  className="w-full px-4 py-2.5 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-[14px] font-normal text-[#000000] outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-normal text-slate-600 ml-1">หน่วย</label>
                <input 
                  value={newItemData.unit === null || newItemData.unit === undefined ? '' : newItemData.unit}
                  onChange={e => setNewItemData(prev => ({...prev, unit: e.target.value}))}
                  className="w-full px-4 py-2.5 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-[14px] font-normal text-[#000000] outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-normal text-slate-600 ml-1">จำนวนสั่งซื้อ</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={newItemData.order_qty === null || newItemData.order_qty === undefined ? '' : newItemData.order_qty}
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                    setNewItemData(prev => ({...prev, order_qty: val}));
                  }}
                  className="w-full px-4 py-2.5 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-[14px] font-normal text-[#000000] outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-normal text-slate-600 ml-1">จุดสั่งซื้อ</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={newItemData.order_point === null || newItemData.order_point === undefined ? '' : newItemData.order_point}
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                    setNewItemData(prev => ({...prev, order_point: val}));
                  }}
                  className="w-full px-4 py-2.5 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-[14px] font-normal text-[#000000] outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-normal text-slate-600 ml-1">จำนวนที่ต้องมี</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={newItemData.target_stock === null || newItemData.target_stock === undefined ? '' : newItemData.target_stock}
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                    setNewItemData(prev => ({...prev, target_stock: val}));
                  }}
                  className="w-full px-4 py-2.5 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-[14px] font-normal text-[#000000] outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-normal text-slate-600 ml-1">ช่องทางสั่งซื้อ</label>
                <input 
                  value={newItemData.source === null || newItemData.source === undefined ? '' : newItemData.source}
                  onChange={e => setNewItemData(prev => ({...prev, source: e.target.value}))}
                  className="w-full px-4 py-2.5 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-[14px] font-normal text-[#000000] outline-none transition-all"
                />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-3xl text-[14px] font-normal text-[#000000] transition-colors">
                ยกเลิก
              </button>
              <button type="submit" className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-3xl text-[14px] font-normal text-white transition-colors shadow-sm">
                บันทึกข้อมูล
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Delete Confirm Alert */}
    {deleteId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-normal text-[#000000] mb-2">ต้องการลบรายการนี้ใช่หรือไม่?</h3>
          <p className="text-sm font-normal text-slate-500 mb-6">ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-3xl text-[14px] font-normal text-[#000000] transition-colors">
              ยกเลิก
            </button>
            <button onClick={executeDelete} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 rounded-3xl text-[14px] font-normal text-white transition-colors shadow-sm">
              ลบรายการ
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}