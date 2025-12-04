
import { Ticket, TicketCategory, TicketStatus, Sentiment } from './types';

const RAW_MOCK_DATA = [
  {
    "TicketID": "TICK-1001",
    "Customer": "Alice Johnson",
    "Category": "Billing",
    "Status": "Resolved",
    "Sentiment": "Neutral",
    "Timestamp": "2023-10-25T09:30:00Z",
    "Transcript": [
      { "role": "Customer", "text": "I was charged twice for my subscription this month." },
      { "role": "Agent", "text": "I apologize for the inconvenience, Alice. Let me check your account." },
      { "role": "Agent", "text": "I see the duplicate charge. I have initiated a refund for the second transaction." },
      { "role": "Customer", "text": "Thank you, that's all I needed." }
    ]
  },
  {
    "TicketID": "TICK-1002",
    "Customer": "Bob Smith",
    "Category": "Technical",
    "Status": "Escalated",
    "Sentiment": "Negative",
    "Timestamp": "2023-10-25T10:15:00Z",
    "Transcript": [
      { "role": "Customer", "text": "The app keeps crashing when I try to export data." },
      { "role": "Agent", "text": "Have you tried clearing your cache?" },
      { "role": "Customer", "text": "Yes, obviously. It's a bug in your latest update." },
      { "role": "Agent", "text": "I see. I will need to escalate this to the engineering team." },
      { "role": "Customer", "text": "This is frustrating. I need this for a meeting." }
    ]
  },
  {
    "TicketID": "TICK-1003",
    "Customer": "Charlie Davis",
    "Category": "Shipping",
    "Status": "Pending",
    "Sentiment": "Neutral",
    "Timestamp": "2023-10-25T11:00:00Z",
    "Transcript": [
      { "role": "Customer", "text": "Where is my order #5544?" },
      { "role": "Agent", "text": "Let me track that for you." },
      { "role": "Agent", "text": "It seems to be delayed at the distribution center." },
      { "role": "Customer", "text": "When will it arrive?" },
      { "role": "Agent", "text": "I am waiting for an update from the carrier." }
    ]
  },
  {
    "TicketID": "TICK-1004",
    "Customer": "Diana Prince",
    "Category": "Returns",
    "Status": "Resolved",
    "Sentiment": "Positive",
    "Timestamp": "2023-10-25T12:30:00Z",
    "Transcript": [
      { "role": "Customer", "text": "I'd like to return the shoes, they are too small." },
      { "role": "Agent", "text": "No problem, Diana. I've emailed you a return label." },
      { "role": "Customer", "text": "Got it! You guys are fast. Thanks!" },
      { "role": "Agent", "text": "You're welcome! Have a great day." }
    ]
  },
  {
    "TicketID": "TICK-1005",
    "Customer": "Evan Wright",
    "Category": "Technical",
    "Status": "Resolved",
    "Sentiment": "Positive",
    "Timestamp": "2023-10-25T13:45:00Z",
    "Transcript": [
      { "role": "Customer", "text": "How do I change my password?" },
      { "role": "Agent", "text": "Go to Settings > Security > Change Password." },
      { "role": "Customer", "text": "Found it. Thanks for the quick help." }
    ]
  }
];

export const MOCK_TICKETS: Ticket[] = RAW_MOCK_DATA.map((raw, index) => ({
    id: raw.TicketID,
    customerName: raw.Customer,
    category: raw.Category as TicketCategory,
    status: raw.Status as TicketStatus,
    sentiment: raw.Sentiment as Sentiment,
    timestamp: raw.Timestamp,
    transcript: raw.Transcript as any[],
    originalData: raw
}));
