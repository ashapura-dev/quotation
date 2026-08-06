import { Center, Loader, Table, type TableProps } from "@mantine/core";
import type { ReactNode } from "react";

export interface DataTableColumn {
  key: string;
  header: ReactNode;
  className?: string;
}

interface DataTableProps extends Pick<TableProps, "striped" | "highlightOnHover" | "verticalSpacing"> {
  columns: DataTableColumn[];
  children: ReactNode;
  loading?: boolean;
  minWidth?: number;
  className?: string;
  loadingHeight?: number;
}

/** Shared table frame for consistent headers, horizontal scrolling and loading states. */
export function DataTable({
  columns,
  children,
  loading = false,
  minWidth = 800,
  className,
  loadingHeight = 200,
  striped = true,
  highlightOnHover = true,
  verticalSpacing = "sm",
}: DataTableProps) {
  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table
        className={className}
        striped={striped}
        highlightOnHover={highlightOnHover}
        verticalSpacing={verticalSpacing}
      >
        <Table.Thead>
          <Table.Tr>
            {columns.map((column) => (
              <Table.Th key={column.key} className={column.className}>{column.header}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length}>
                <Center h={loadingHeight}><Loader size="md" /></Center>
              </Table.Td>
            </Table.Tr>
          ) : children}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
