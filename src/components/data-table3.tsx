"use client"

import * as React from "react"

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnOrderState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"


import {
  GripVertical,
  MoreVertical,
  ColumnsIcon,
  Download,
  RefreshCcw,
  Trash2,
  FileDown,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
   ExternalLink, 
  TrendingUp, 
  Tag,
  Copy,
  MoreHorizontal,
  Eye,
  AlertCircle,
  Check

} from "lucide-react"

import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
   DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"

import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell
} from "@/components/ui/table"

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select"

import { Label } from "@/components/ui/label"

import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ScraperDetailSheet } from "@/components/dashboard/ScraperDetailSheet"; // Import the clean component


import { cn } from "@/lib/utils"; // Adjust the path based on your folder structure


import { CSS } from "@dnd-kit/utilities";

import {
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DndContext,
  closestCenter,

} from "@dnd-kit/core"

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable"


import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

import { useDebounce } from "@/hooks/use-debounce"
import { useForensics } from "@/hooks/use-forensics"



interface ConfirmClearButtonProps {
  onConfirm: () => void;
}

export function ConfirmClearButton({ onConfirm }: ConfirmClearButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-700/30 hover:text-neutral-400 border-none"
        >
          <Trash2 className="size-4" />
          Clear Table
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all records from the backend and wipe your current dashboard view. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Continue & Clear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* DRAGGABLE ROW                               */
/* -------------------------------------------------------------------------- */

interface DraggableRowProps {
  row: any
}

function DraggableRow({ row }: DraggableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id, // This uses the row.sku because of getRowId in useReactTable
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 1,
    position: "relative",
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "group transition-colors",
        isDragging && "bg-muted/80 shadow-2xl border-primary/20"
      )}
    >
      {row.getVisibleCells().map((cell: any) => (
        <TableCell key={cell.id} className="py-2">
          {cell.column.id === "drag" ? (
            // The handle only exists in the 'drag' column
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-primary transition-colors p-2"
            >
              <GripVertical className="size-4" />
            </div>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}


/* -------------------------------------------------------------------------- */
/*                                SCHEMA                                      */
/* -------------------------------------------------------------------------- */

export const schema = z.object({
  sku: z.string(),
  title: z.string(),
  brand: z.string(),
  price: z.number(),
  status: z.string(),
  source_url: z.string().nullable(),
  scraped_at: z.string(),
})

export type ScraperEntry = z.infer<typeof schema>



/* -------------------------------------------------------------------------- */
/*                              ROW ACTIONS                                   */
/* -------------------------------------------------------------------------- */
const RowActions = React.memo(function RowActions({ item }: { item: ScraperEntry }) {
  const [isCopied, setIsCopied] = React.useState(false);
  const { removeItem } = useForensics();

  

  const handleCopy = () => {
    navigator.clipboard.writeText(item.sku);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <Sheet>
      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0 hover:bg-indigo-500/10 transition-colors">
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="z-50 w-52 overflow-hidden rounded-xl p-3
          border border-neutral-400/40 dark:border-indigo-500/20
          bg-white/50 dark:bg-neutral-950/30
          backdrop-blur-2xl
          shadow-[0_0_25px_-5px_rgba(255,255,255,0.35),0_0_60px_-15px_rgba(255,255,255,0.25)]
          dark:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4),0_0_70px_-15px_rgba(139,92,246,0.3)]">
            <DropdownMenuLabel className="px-2 py-1 text-[9px] font-bold tracking-widest text-muted-foreground/60 uppercase">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="mx-1 bg-neutral-300 dark:bg-neutral-700" />

            <SheetTrigger asChild>
              <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer py-1.5">
                <Eye className="size-3.5 text-indigo-500" />
                <span className="font-medium">View Details</span>
              </DropdownMenuItem>
            </SheetTrigger>

            <DropdownMenuItem 
              onSelect={(e) => e.preventDefault()} 
              onClick={handleCopy} 
              className="rounded-lg gap-2 py-1.5 cursor-pointer"
            >
              {isCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span className={isCopied ? "text-emerald-500 font-semibold" : ""}>
                {isCopied ? "Copied!" : "Copy SKU"}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-1  bg-neutral-300 dark:bg-neutral-700" />

            <AlertDialogTrigger asChild>
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()} 
                className="rounded-lg gap-2 py-1.5 text-rose-500 focus:bg-rose-500/10 focus:text-rose-500 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span className="font-medium">Remove</span>
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the item with SKU: <strong>{item.sku}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => removeItem(item.sku)} 
              className="bg-rose-500 hover:bg-rose-600"
            >
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScraperDetailSheet item={item} />
    </Sheet>
  );
});
/* -------------------------------------------------------------------------- */
/*                                COLUMNS                                     */
/* -------------------------------------------------------------------------- */


export const columns: ColumnDef<ScraperEntry>[] = [
  {
    id: "drag",
    header: "",
    cell: () => (
      /* Reduced opacity until hover makes it feel less cluttered */
      <div className="flex items-center justify-center cursor-grab text-muted-foreground/40 hover:text-primary transition-colors">
        <GripVertical className="size-4" />
      </div>
    ),
    size: 40,
  },
  {
    accessorKey: "sku",
    header: "SKU",
    enableGlobalFilter:true,
    cell: ({ row }) => (
      /* Using a subtle background for IDs is a very Shadcn move */
      <div className="flex items-center">
        <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono font-medium text-muted-foreground border border-border/50">
          {row.original.sku}
        </span>
      </div>
    )
  },
  {
    accessorKey: "title",
    header: "Product",
    enableGlobalFilter:true,
    cell: ({ row }) => (
      <div className="flex flex-col gap-0 py-1">
        {/* Product Title: Smaller, lighter text weight */}
        <span className="text-[13px] font-normal leading-tight text-foreground  max-w-[200px]">
          {row.original.title}
        </span>
        
        {/* Metadata: Super minimal, greyed out */}
        <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
          Best Buy
        </div>
      </div>
    ),
    /* This ensures the column can shrink/grow but has a sensible ceiling */
    size: 300, 
    minSize: 200,
  },
  {
    accessorKey: "brand",
    header: "Brand",
    enableGlobalFilter:true,
    cell: ({ row }) => (
      /* Using a secondary badge keeps the primary green/red status colors dominant */
      <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-wider px-1.5 py-0">
        {row.original.brand}
      </Badge>
    )
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => {
      const price = row.original.price;
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono font-bold text-sm">
            ${price}
          </span>
          {/* Decorative element: makes the price feel "live" */}
          <div className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
             <TrendingUp className="size-3" />
             Live
          </div>
        </div>
      )
    }
  },
 {
  accessorKey: "status",
  header: "Status",
  enableGlobalFilter:true,
  cell: ({ row }) => {
    const status = row.original.status;
    const s = status.toLowerCase();

    // Define our status configurations
    const config = {
      success: {
        color: "bg-green-500/10 text-green-500",
        icon: <CheckCircle2 className="size-3 stroke-[3px]" />,
        label: "SUCCESS"
      },
      isscraping: {
        color: "bg-magenta-500/10 text-magenta-500 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
        icon: <Loader2 className="size-3 animate-spin stroke-[3px]" />,
        label: "SCRAPING"
      },
      error: {
        color: "bg-red-500/10 text-red-500",
        icon: <AlertCircle className="size-3 stroke-[3px]" />,
        label: "FAILED"
      }
    };

    // Determine which config to use (fallback to error if status is unknown)
    const current = s.includes("success") ? config.success : 
                    s.includes("scraping") ? config.isscraping : 
                    config.error;

    return (
      <div className="flex items-center justify-start">
        <Badge 
          variant="outline" 
          className={cn(
            "flex gap-1.5 items-center px-2 py-0.5 border-none",
            current.color
          )}
        >
          {current.icon}
          <span className="text-[11px] font-bold tracking-wider">
            {current.label}
          </span>
        </Badge>
      </div>
    );
  }
},
  {
    accessorKey: "scraped_at",
    header: "Scraped",
    cell: ({ row }) => {
      const date = new Date(row.original.scraped_at)
      return (
        <div className="flex flex-col text-[11px]">
          <span className="text-foreground font-medium">
            {date.toLocaleDateString()}
          </span>
          <span className="text-muted-foreground/70">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: "source_url",
    header: "Source",
    cell: ({ row }) => {
      const url = row.original.source_url
      if (!url) return <span className="text-muted-foreground text-[10px]">N/A</span>

      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 px-2 py-1 rounded hover:bg-blue-500/20 transition-all text-[10px] font-bold uppercase tracking-tight"
        >
          View <ExternalLink className="size-3" />
        </a>
      )
    }
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end pr-2">
        <RowActions item={row.original} />
      </div>
    )
  }
]


export function DataTable() {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const debouncedFilter = useDebounce(globalFilter, 300)
  
  const { data, clearTable } = useForensics()
  
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })



  const rowIds = React.useMemo(
    () => data.map((item: any) => item.sku),
    [data]
  )

  const memoColumns = React.useMemo(() => columns, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const table = useReactTable({
    data,
    columns:memoColumns,
    state: { sorting, columnFilters, columnVisibility, pagination,globalFilter:debouncedFilter },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row: any) => row.sku 
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
       // Drag and drop local reorder logic if required
    }
  }

  function exportData() {
    const rows = [
      ["SKU","Title","Brand","Price","Status"], 
      ...data.map(d => [d.sku, d.title, d.brand, d.price, d.status])
    ]
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "export.csv"; a.click()
  }

  const isSortingActive = sorting.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <Input
              placeholder="Search SKU, product,Brand, or status..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm h-9"
            />
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="scraping">Scraping</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          
          <ConfirmClearButton onConfirm={clearTable} />

          {table.getState().columnFilters.length > 0 && (
            <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-9 px-2 text-xs text-muted-foreground">
              <RefreshCcw className="mr-2 size-3" /> Reset
            </Button>
          )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportData} 
            className="h-9 gap-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 
                      hover:from-emerald-600 hover:via-teal-700 hover:to-cyan-700 
                      text-white shadow-lg shadow-emerald-900/30 border-none transition-all duration-300"
          >
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><ColumnsIcon className="mr-2 size-4"/> Columns</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns().filter(c => c.getCanHide()).map((column) => (
                <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(v) => column.toggleVisibility(!!v)}>
                  {column.id.replace("_", " ")}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="rounded-lg border overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} onClick={header.column.getToggleSortingHandler()}>
                      <div className="flex items-center gap-2 cursor-pointer select-none">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy} disabled={isSortingActive}>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => <DraggableRow key={row.id} row={row} />)
                ) : (
                  <TableRow><TableCell colSpan={columns.length} className="text-center h-24">No results found.</TableCell></TableRow>
                )}
              </SortableContext>
            </TableBody>
          </Table>
        </div>
      </DndContext>

      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Rows</Label>
          <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue/></SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40].map((size) => <SelectItem key={size} value={`${size}`}>{size}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="size-4"/></Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="size-4"/></Button>
          <div className="px-2 text-xs font-medium">{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</div>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="size-4"/></Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="size-4"/></Button>
        </div>
      </div>
    </div>
  )
}