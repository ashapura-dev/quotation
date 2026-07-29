import { Badge, Button, Card, Group, Modal, Select, Stack, Table, Text, Textarea, Timeline, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  approveQuotation,
  duplicateQuotation,
  emailQuotation,
  fetchQuotation,
  fetchStatusHistory,
  markQuotationSent,
  quotationPdfUrl,
  rejectQuotation,
  submitQuotation,
} from "../../api/quotations";
import { fetchPdfTemplates } from "../../api/pdfTemplates";
import { useAuth } from "../../hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "gray",
  PENDING: "yellow",
  APPROVED: "blue",
  SENT: "green",
};

export function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rejectOpened, { open: openReject, close: closeReject }] = useDisclosure(false);
  const [rejectComment, setRejectComment] = useState("");
  const [emailOpened, { open: openEmail, close: closeEmail }] = useDisclosure(false);
  const [emailTemplateId, setEmailTemplateId] = useState<string | null>(null);
  const [emailToAddress, setEmailToAddress] = useState("");

  const query = useQuery({ queryKey: ["quotation", id], queryFn: () => fetchQuotation(Number(id)) });
  const historyQuery = useQuery({ queryKey: ["quotation-history", id], queryFn: () => fetchStatusHistory(Number(id)) });
  const pdfTemplatesQuery = useQuery({ queryKey: ["pdf-templates", false], queryFn: () => fetchPdfTemplates(false) });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["quotation", id] });
    queryClient.invalidateQueries({ queryKey: ["quotation-history", id] });
    queryClient.invalidateQueries({ queryKey: ["quotations"] });
  }

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateQuotation(Number(id)),
    onSuccess: (quotation) => {
      notifications.show({ color: "green", message: `Duplicated as ${quotation.quotationNumber}` });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      navigate(`/quotations/${quotation.id}`);
    },
  });

  const errorHandler = (label: string) => (err: Error) =>
    notifications.show({ color: "red", title: label, message: err.message });

  const submitMutation = useMutation({
    mutationFn: () => submitQuotation(Number(id)),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Submitted for approval" });
      invalidateAll();
    },
    onError: errorHandler("Could not submit"),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveQuotation(Number(id)),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Quotation approved" });
      invalidateAll();
    },
    onError: errorHandler("Could not approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectQuotation(Number(id), rejectComment),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Sent back to Draft" });
      invalidateAll();
      closeReject();
      setRejectComment("");
    },
    onError: errorHandler("Could not reject"),
  });

  const markSentMutation = useMutation({
    mutationFn: () => markQuotationSent(Number(id)),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Marked as Sent" });
      invalidateAll();
    },
    onError: errorHandler("Could not mark as sent"),
  });

  const emailMutation = useMutation({
    mutationFn: () =>
      emailQuotation(Number(id), {
        templateId: emailTemplateId ? Number(emailTemplateId) : undefined,
        toAddress: emailToAddress || undefined,
      }),
    onSuccess: (result) => {
      notifications.show({ color: "green", message: `PDF emailed to ${result.sentTo}` });
      closeEmail();
    },
    onError: errorHandler("Could not send email"),
  });

  if (query.isLoading || !query.data) return <Text>Loading...</Text>;
  const q = query.data;
  const isOwner = user?.id === q.createdById;
  const isAdmin = user?.role === "ADMIN";
  const canEdit = (q.status === "DRAFT" || isAdmin) && (isAdmin || isOwner);
  const canSubmit = q.status === "DRAFT" && (isAdmin || (isOwner && user?.role === "STAFF"));
  const canApproveReject = q.status === "PENDING" && (isAdmin || user?.role === "APPROVER");
  const canMarkSent = q.status === "APPROVED" && (isAdmin || (isOwner && user?.role === "STAFF"));

  return (
    <div>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>{q.quotationNumber}</Title>
          <Text fw={700} size="md" c="blue" mt={2}>
            {q.quotationType === "NON_DPD" ? "Import Clearance for Non-DPD Cargo" : "Import Clearance for DPD Cargo"}
          </Text>
          <Group gap="xs" mt={6}>
            <Badge color={STATUS_COLOR[q.status]}>{q.status}</Badge>
            <Text size="sm" c="dimmed">
              {q.quotationType} · created by {q.createdBy?.name} on {new Date(q.createdAt).toLocaleDateString()}
            </Text>
          </Group>
        </div>
        <Group>
          <Button component="a" href={quotationPdfUrl(q.id, API_BASE)} target="_blank" variant="light">
            Download PDF
          </Button>
          <Button
            variant="light"
            onClick={() => {
              setEmailToAddress(q.clientEmail ?? "");
              setEmailTemplateId(null);
              openEmail();
            }}
          >
            Email PDF
          </Button>
          <Button variant="light" onClick={() => duplicateMutation.mutate()} loading={duplicateMutation.isPending}>
            Duplicate
          </Button>
          {canEdit && (
            <Button variant="light" onClick={() => navigate(`/quotations/${q.id}/edit`)}>
              Edit
            </Button>
          )}
          {canSubmit && (
            <Button onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
              Submit for approval
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button color="red" variant="light" onClick={openReject}>
                Reject
              </Button>
              <Button color="green" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>
                Approve
              </Button>
            </>
          )}
          {canMarkSent && (
            <Button onClick={() => markSentMutation.mutate()} loading={markSentMutation.isPending}>
              Mark as Sent
            </Button>
          )}
        </Group>
      </Group>

      <Card mb="md">
        <Text fw={600} mb="xs">
          Client
        </Text>
        <Text>{q.clientName}</Text>
        {q.clientAddress && <Text size="sm" c="dimmed">{q.clientAddress}</Text>}
        <Group gap="lg" mt="xs">
          {q.clientContactPerson && <Text size="sm">Contact: {q.clientContactPerson}</Text>}
          {q.clientPhone && <Text size="sm">Phone: {q.clientPhone}</Text>}
          {q.clientEmail && <Text size="sm">Email: {q.clientEmail}</Text>}
          {q.clientGstin && <Text size="sm">GSTIN: {q.clientGstin}</Text>}
        </Group>
      </Card>


      <Card mb="md">
        <Text fw={600} mb="xs">
          Rate components
        </Text>
        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Particulars</Table.Th>
              <Table.Th ta="right">Per 20'</Table.Th>
              <Table.Th ta="right">Per 40'</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {q.lineItems.map((li, i) => {
              const breakdown = li.containerBreakdown as any[] | null;
              let rate20 = "-";
              let rate40 = "-";

              if (li.componentType === "PER_CONTAINER" && breakdown && Array.isArray(breakdown)) {
                const entry20 = breakdown.find((b: any) => b.label.includes("20"));
                const entry40 = breakdown.find((b: any) => b.label.includes("40"));
                if (entry20 && entry20.rate) rate20 = `Rs. ${Number(entry20.rate).toFixed(2)}`;
                if (entry40 && entry40.rate) rate40 = `Rs. ${Number(entry40.rate).toFixed(2)}`;
              } else if (li.componentType === "FIXED") {
                const val = `Rs. ${Number(li.fixedValue ?? 0).toFixed(2)}`;
                rate20 = val;
                rate40 = val;
              } else if (li.componentType === "PERCENTAGE") {
                const val = `${Number(li.percentageValue ?? 0).toFixed(2)}%`;
                rate20 = val;
                rate40 = val;
              }

              return (
                <Table.Tr key={i}>
                  <Table.Td>
                    <div>
                      {li.label} {li.isTax && <Badge size="xs" ml={4}>Tax</Badge>}
                    </div>
                  </Table.Td>
                  <Table.Td ta="right">{rate20}</Table.Td>
                  <Table.Td ta="right">{rate40}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>

      </Card>

      {q.notes && (
        <Card mb="md">
          <Text fw={600} mb="xs">
            Notes
          </Text>
          <Text size="sm">{q.notes}</Text>
        </Card>
      )}

      {historyQuery.data && historyQuery.data.length > 0 && (
        <Card>
          <Text fw={600} mb="md">
            Status history
          </Text>
          <Timeline active={historyQuery.data.length}>
            {historyQuery.data.map((h) => (
              <Timeline.Item key={h.id} title={`${h.fromStatus} → ${h.toStatus}`}>
                <Text size="sm" c="dimmed">
                  {h.changedBy?.name} · {new Date(h.createdAt).toLocaleString()}
                </Text>
                {h.comment && <Text size="sm">{h.comment}</Text>}
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}

      <Modal opened={rejectOpened} onClose={closeReject} title="Reject quotation">
        <Stack>
          <Textarea
            label="Reason"
            required
            value={rejectComment}
            onChange={(e) => setRejectComment(e.currentTarget.value)}
            placeholder="Explain what needs to change before resubmission"
          />
          <Button color="red" onClick={() => rejectMutation.mutate()} loading={rejectMutation.isPending} disabled={!rejectComment.trim()}>
            Send back to Draft
          </Button>
        </Stack>
      </Modal>

      <Modal opened={emailOpened} onClose={closeEmail} title="Email quotation PDF">
        <Stack>
          <Select
            label="PDF template"
            placeholder="Use default"
            clearable
            data={pdfTemplatesQuery.data?.map((t) => ({ value: String(t.id), label: t.name })) ?? []}
            value={emailTemplateId}
            onChange={setEmailTemplateId}
          />
          <Textarea
            label="Send to"
            required
            autosize
            minRows={1}
            value={emailToAddress}
            onChange={(e) => setEmailToAddress(e.currentTarget.value)}
            placeholder="client@example.com"
          />
          <Button onClick={() => emailMutation.mutate()} loading={emailMutation.isPending} disabled={!emailToAddress.trim()}>
            Send email
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
