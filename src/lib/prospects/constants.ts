export const PROSPECT_STATUS_LABELS: Record<string, string> = {
  new: "New",
  emailing: "Emailing",
  no_response: "No Response",
  responded: "Responded",
  interested: "Interested",
  not_interested: "Not Interested",
  bounced: "Bounced",
  converted: "Converted",
  archived: "Archived",
};

export const PROSPECT_STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700 border-gray-200",
  emailing: "bg-blue-100 text-blue-700 border-blue-200",
  no_response: "bg-yellow-100 text-yellow-700 border-yellow-200",
  responded: "bg-emerald-100 text-emerald-700 border-emerald-200",
  interested: "bg-green-100 text-green-700 border-green-200",
  not_interested: "bg-red-100 text-red-700 border-red-200",
  bounced: "bg-orange-100 text-orange-700 border-orange-200",
  converted: "bg-teal-100 text-teal-700 border-teal-200",
  archived: "bg-gray-50 text-gray-400 border-gray-200",
};

export const PIPELINE_STATUSES = ["new", "emailing", "responded", "interested"];
