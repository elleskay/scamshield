import { Injectable } from "@nestjs/common";

export interface Alert {
  id: string;
  title: string;
  body: string;
  category: string;
  date: string;
}

// Seeded advisories for the awareness feed. In production these come from the
// scam-trends datastore, curated by the team. Static and deterministic here.
const ALERTS: Alert[] = [
  {
    id: "alert-parcel-fee",
    title: "Parcel 'redelivery fee' texts",
    body: "Messages claiming a package is held until you pay a small fee. The link leads to a fake payment page that steals card details. Couriers do not collect fees by SMS link.",
    category: "Phishing",
    date: "2026-05-28",
  },
  {
    id: "alert-bank-reverify",
    title: "Fake bank 'reverify your account' SMS",
    body: "Texts warning your account will be locked unless you verify via a link. Banks never ask you to log in through a link in a message. Go to the bank app directly.",
    category: "Phishing",
    date: "2026-05-24",
  },
  {
    id: "alert-gov-impersonation",
    title: "Calls impersonating government agencies",
    body: "Callers posing as CPF, immigration, or police claiming you owe money or are under investigation, then pressuring you to transfer funds. Hang up and check the number under Check Call.",
    category: "Impersonation",
    date: "2026-05-20",
  },
  {
    id: "alert-job-upfront-fee",
    title: "Job offers with upfront 'training' fees",
    body: "Easy work-from-home roles that ask you to pay for training, a starter kit, or to complete prepaid 'tasks'. Legitimate employers do not ask new hires to pay money.",
    category: "Job scam",
    date: "2026-05-15",
  },
];

/** Scam-awareness feed (advisories about emerging trends). */
@Injectable()
export class AlertsService {
  list(): Alert[] {
    return ALERTS;
  }
}
