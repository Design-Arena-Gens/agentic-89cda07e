"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type Sender = "agent" | "user";

interface Message {
  id: string;
  sender: Sender;
  text: string;
}

type Stage =
  | "greeting-response"
  | "ask-name"
  | "ask-age"
  | "ask-issue"
  | "ask-slot"
  | "done";

interface PatientDetails {
  name: string;
  age: string;
  issue: string;
  slot: string;
}

const QUESTION_RESPONSES: Array<{
  keywords: string[];
  response: string;
}> = [
  {
    keywords: ["service", "treatment", "kya milta", "kis kis"],
    response:
      "Humare clinic me skin, hair care, pain management aur wellness consultations milte hain ji."
  },
  {
    keywords: ["timing", "time", "kab", "open", "opening", "band"],
    response:
      "Clinic daily subah 9 baje se shaam 7 baje tak khula rehta hai ji."
  },
  {
    keywords: ["doctor", "dr", "specialist"],
    response:
      "Humare senior consultant Dr. Meera Sharma ji personally appointments handle karti hain ji."
  },
  {
    keywords: ["fee", "fees", "cost", "paisa", "charges", "price"],
    response:
      "Consultation ki fee 600 rupaye hai ji, jo visit ke samay clinic par submit hoti hai ji."
  },
  {
    keywords: ["address", "location", "kahan", "map"],
    response:
      "Clinic ka address WhatsApp/SMS dwara turant bhej diya jayega ji. Landmark: Central Metro ke paas, Sector 12 ji."
  },
  {
    keywords: ["parking"],
    response:
      "Clinic ke paas hi visitors ke liye parking facility available hai ji."
  }
];

function getStagePrompt(stage: Stage, patient: PatientDetails): string | null {
  switch (stage) {
    case "ask-name":
      return "Main note kar leti hoon ji. Aapka poora naam bataiye ji.";
    case "ask-age":
      return `${patient.name ? `${patient.name} ji, ` : ""}aapki umar kya hai ji?`;
    case "ask-issue":
      return "Kaunsi samasya ke liye appointment lena chahte hain ji? (jaise bal girna, dard, skin problem)";
    case "ask-slot":
      return "Aapko appointment ke liye kaunsa din aur time convenient rahega ji?";
    case "done":
      return "Kya aapko kisi aur cheez me madad chahiye ji?";
    default:
      return null;
  }
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function titleCaseName(input: string) {
  return input
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function findQuestionResponse(lowerInput: string) {
  return QUESTION_RESPONSES.find(({ keywords }) =>
    keywords.some((keyword) => lowerInput.includes(keyword))
  );
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: createId(),
      sender: "agent",
      text: "Namaste ji! Main _________ Clinic se bol rahi hoon. Aap kaise hain ji?"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [stage, setStage] = useState<Stage>("greeting-response");
  const [patient, setPatient] = useState<PatientDetails>({
    name: "",
    age: "",
    issue: "",
    slot: ""
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = normalizeWhitespace(inputValue);
    if (!trimmed) return;

    const userMessage: Message = {
      id: createId(),
      sender: "user",
      text: trimmed
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    window.setTimeout(() => {
      processUserInput(trimmed.toLowerCase(), trimmed);
    }, 220);
  };

  const pushAgentMessage = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const agentMessage: Message = {
      id: createId(),
      sender: "agent",
      text: clean
    };
    setMessages((prev) => [...prev, agentMessage]);
  };

  const processUserInput = (lowerInput: string, originalInput: string) => {
    const questionMatch = findQuestionResponse(lowerInput);

    if (questionMatch) {
      pushAgentMessage(`${questionMatch.response}`);

      const reminder = getStagePrompt(stage, patient);
      if (reminder && stage !== "done") {
        window.setTimeout(() => {
          pushAgentMessage(reminder);
        }, 350);
      }
      if (stage === "done") {
        pushAgentMessage(
          "Main yahin hoon ji, jab bhi aap ready hon appointment details confirm karne ke liye bataiye ji."
        );
      }
      return;
    }

    switch (stage) {
      case "greeting-response": {
        pushAgentMessage(
          "Bahut accha ji! Main note kar leti hoon. Aapka poora naam bataiye ji."
        );
        setStage("ask-name");
        break;
      }
      case "ask-name": {
        const words = originalInput
          .split(" ")
          .filter((word) => /^[a-zA-Z\u0900-\u097F'.-]+$/.test(word));
        if (words.length < 2) {
          pushAgentMessage(
            "Mujhe aapka poora naam theek se samajh nahi aaya ji. Kripya apna first aur last name bataiye ji."
          );
          return;
        }
        const formattedName = titleCaseName(words.join(" "));
        setPatient((prev) => ({ ...prev, name: formattedName }));
        pushAgentMessage(
          `Dhanyavaad ${formattedName} ji! Aapki umar kya hai ji?`
        );
        setStage("ask-age");
        break;
      }
      case "ask-age": {
        const ageMatch = originalInput.match(/(\d{1,3})/);
        if (!ageMatch) {
          pushAgentMessage(
            "Maaf kijiye ji, mujhe aapki umar samajh nahi aayi. Kripya pure ank me batayein, jaise 32 ji."
          );
          return;
        }
        const age = parseInt(ageMatch[1], 10);
        if (Number.isNaN(age) || age < 1 || age > 120) {
          pushAgentMessage(
            "Kya aap apni sahi umar bata sakte hain ji? 1 se 120 ke beech me koi bhi ank chalega ji."
          );
          return;
        }
        setPatient((prev) => ({ ...prev, age: `${age}` }));
        pushAgentMessage(
          "Samajh gayi ji. Kaunsi samasya ke liye appointment lena chahte hain ji?"
        );
        setStage("ask-issue");
        break;
      }
      case "ask-issue": {
        if (originalInput.length < 4) {
          pushAgentMessage(
            "Kripya thoda detail me batayein ji ki aapko kis takleef ke liye salaah chahiye ji."
          );
          return;
        }
        const concern = originalInput.charAt(0).toUpperCase() + originalInput.slice(1);
        setPatient((prev) => ({ ...prev, issue: concern }));
        pushAgentMessage(
          "Theek hai ji. Aapko appointment ke liye kaunsa din aur time convenient rahega ji?"
        );
        setStage("ask-slot");
        break;
      }
      case "ask-slot": {
        if (originalInput.length < 3) {
          pushAgentMessage(
            "Kripya koi specific din aur time suggest kijiye ji, jaise 'Somwaar dopahar 3 baje' ji."
          );
          return;
        }
        const slot = originalInput;
        setPatient((prev) => ({ ...prev, slot }));
        pushAgentMessage(
          `Bahut badhiya ji! Main ${slot} ke liye appointment block kar rahi hoon ji.`
        );
        window.setTimeout(() => {
          pushAgentMessage(
            "Aapka appointment confirm kar diya gaya hai. Clinic ka address aur timing WhatsApp/SMS me bhej diya jayega ji."
          );
        }, 400);
        window.setTimeout(() => {
          pushAgentMessage(
            "Kya aapko kisi aur cheez me madad chahiye ji? Main yahin hoon ji."
          );
        }, 800);
        setStage("done");
        break;
      }
      case "done": {
        pushAgentMessage(
          "Dhanyavaad ji! Agar aapko aur koi sawaal ya reschedule karna ho to bas bata dijiye ji."
        );
        break;
      }
      default:
        break;
    }
  };

  const summary = useMemo(() => {
    if (!patient.name && !patient.age && !patient.issue && !patient.slot) {
      return null;
    }
    return [
      patient.name && `Naam: ${patient.name} ji`,
      patient.age && `Umar: ${patient.age} saal`,
      patient.issue && `Samasya: ${patient.issue}`,
      patient.slot && `Preferred time: ${patient.slot}`
    ]
      .filter(Boolean)
      .join(" | ");
  }, [patient]);

  return (
    <main className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-clinic-primary text-white">
            <span className="text-xl font-semibold">AI</span>
          </div>
          <h1 className="text-3xl font-semibold text-clinic-secondary">
            _________ Clinic Receptionist
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Hindi me professional, polite aur helpful appointment assistant ji.
          </p>
        </header>

        <section className="rounded-3xl bg-white shadow-xl">
          <div
            ref={containerRef}
            className="flex max-h-[480px] flex-col gap-3 overflow-y-auto px-6 py-6"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx("flex", {
                  "justify-end": message.sender === "user",
                  "justify-start": message.sender === "agent"
                })}
              >
                <div
                  className={clsx(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                    message.sender === "agent"
                      ? "rounded-bl-sm bg-clinic-primary/10 text-clinic-secondary"
                      : "rounded-br-sm bg-clinic-primary text-white"
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <form
              className="flex items-center gap-3"
              onSubmit={handleSubmit}
              autoComplete="off"
            >
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                type="text"
                placeholder="Yahan likhiye ji..."
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-clinic-primary focus:ring-2 focus:ring-clinic-primary/30"
              />
              <button
                type="submit"
                className="rounded-2xl bg-clinic-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-clinic-primary/90 focus:outline-none focus:ring-2 focus:ring-clinic-primary/30"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        {summary && (
          <aside className="mt-4 rounded-2xl border border-clinic-primary/20 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-clinic-secondary">
              Appointment Notes
            </h2>
            <p>{summary}</p>
          </aside>
        )}
      </div>
    </main>
  );
}
