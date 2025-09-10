import { Button, Checkbox, Input, Listbox, ListboxButton, ListboxOption, ListboxOptions, Menu, MenuButton, MenuItem, MenuItems, Popover, PopoverButton, PopoverPanel, Tab, TabGroup, TabList, TabPanel, TabPanels, Textarea } from "@headlessui/react";
import useLocalStorage from "./useLocalStorage";
import { useEffect, useState } from "react";
import { downloadFile, getAnswer, getEquality, getOriginalText, getQA, getRedactedText } from "./utils";

const models = ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-5", "gpt-5-mini", "gpt-5-nano"];
const defaultData = [{
  id: crypto.randomUUID(),
  qa: [
    {
      id: "a",
      q: "Who is Pete Hegseth?",
      a: "a Fox News contributor and veteran",
      redact: false,
    },
    {
      id: "b",
      q: "Where is he from?",
      a: "Minnesota",
      redact: true,
    },
    {
      id: "c",
      q: "What is his role?",
      a: "political commentator",
      redact: false,
    },
  ],
  texts: [
    {
      id: "a",
      label: "original",
      text: `Defense Secretary Pete Hegseth’s unusually large personal security requirements are straining the Army agency tasked with protecting him as it pulls agents from criminal investigations to safeguard family residences in Minnesota, Tennessee and D.C., according to numerous officials familiar with the operation.

The sprawling, multimillion-dollar initiative has forced the Army’s Criminal Investigation Division, or CID, the agency that fields security for top Defense Department officials, to staff weeks-long assignments in each location and at times monitor residences belonging to the Hegseths’ former spouses, the officials said.

One CID official, who like some others spoke on the condition of anonymity citing a fear of reprisal, characterized Hegseth’s personal protective arrangement as unlike any other in the agency’s recent history.

“I’ve never seen this many security teams for one guy,” the official said. “Nobody has.”`,
    },
  ],
  policy: "",
  answers: {},
}]
const defaultThreshold = 0.8;

function getScore(item, redactedTextId, threshold = defaultThreshold) {
  let falsePositiveCount = 0;
  let falseNegativeCount = 0;
  let truePositiveCount = 0;
  let trueNegativeCount = 0;

  item.qa.forEach(({ id, redact }) => {
    const score = item.answers[redactedTextId]?.[id]?.score;
    if (score === undefined) return;
    const correct = score >= threshold;
    if (!redact && correct) truePositiveCount += 1;
    else if (!redact && !correct) falseNegativeCount += 1;
    else if (redact && correct) falsePositiveCount += 1;
    else if (redact && !correct) trueNegativeCount += 1;
  });
  const precision = truePositiveCount + falsePositiveCount === 0 ? 1 : truePositiveCount / (truePositiveCount + falsePositiveCount);
  const recall = truePositiveCount + falseNegativeCount === 0 ? 1 : truePositiveCount / (truePositiveCount + falseNegativeCount);
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

function App() {
  const apiKey = useLocalStorage("apiKey");
  const model = useLocalStorage("model", models[0]);
  const [data, setData] = useState(localStorage.getItem("data") ? JSON.parse(localStorage.getItem("data")) : defaultData);
  const [currentItemId, setCurrentItemId] = useState(data[0].id);
  const [threshold, setThreshold] = useState(defaultThreshold);
  const selectedIndex = data.findIndex((item) => item.id === currentItemId);
  const currentItem = data[selectedIndex];
  const [currentRedactedTextId, setCurrentRedactedTextId] = useState(data[0].texts[1]?.id);
  const selectedRedactedTextIndex = currentRedactedTextId ? currentItem.texts.findIndex(text => text.id === currentRedactedTextId) : -1;

  useEffect(() => {
    localStorage.setItem("data", JSON.stringify(data));
  }, [data]);

  return (
    <main className="grid grid-cols-3 gap-px bg-neutral-800 border-b border-neutral-800">
      <header className="bg-black text-sm space-y-2 p-4">
        <h1 className="text-2xl font-medium">Redaction Playground</h1>
        <p className="text-neutral-500 mb-8 text-sm/6">Test your text redaction skills with this interactive playground.<br /><a className="text-blue-500 hover:underline" href="https://github.com/hyunjunian/redaction-playground" target="_blank">GitHub</a><br /><a className="text-blue-500 hover:underline" href="mailto:hyunjunian@gmail.com">hyunjunian@gmail.com</a></p>
        <Button className="rounded-lg focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-neutral-500 bg-neutral-900 px-4 py-2 hover:bg-neutral-800 flex items-center space-x-2" onClick={() => {
          const newApiKey = prompt("Please enter your new OpenAI API key:", apiKey);
          if (newApiKey) localStorage.setItem("apiKey", newApiKey);
          else if (newApiKey === null) return;
          else localStorage.removeItem("apiKey");
          dispatchEvent(new Event("storage"));
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path fillRule="evenodd" d="M8 7a5 5 0 1 1 3.61 4.804l-1.903 1.903A1 1 0 0 1 9 14H8v1a1 1 0 0 1-1 1H6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L8.196 8.39A5.002 5.002 0 0 1 8 7Zm5-3a.75.75 0 0 0 0 1.5A1.5 1.5 0 0 1 14.5 7 .75.75 0 0 0 16 7a3 3 0 0 0-3-3Z" clipRule="evenodd" />
          </svg>
          <span>{apiKey ? "Change" : "Set"} API Key</span>
        </Button>
        <Listbox value={model} onChange={(value) => {
          if (value) localStorage.setItem("model", value);
          else localStorage.removeItem("model");
          dispatchEvent(new Event("storage"));
        }}>
          <ListboxButton
            className="flex items-center justify-between space-x-2 relative rounded-lg bg-neutral-900 py-2 px-4 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-neutral-500 hover:bg-neutral-800"
          >
            <span>{model}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </ListboxButton>
          <ListboxOptions
            anchor="bottom start"
            transition
            className="rounded-xl text-sm border border-neutral-800 outline-none bg-neutral-900 p-1 [--anchor-gap:--spacing(1)] transition duration-100 ease-in data-leave:data-closed:opacity-0"
          >
            {models.map((model) => (
              <ListboxOption
                key={model}
                value={model}
                className="group flex cursor-default items-center space-x-2 rounded-lg px-4 py-2 select-none data-focus:bg-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 invisible group-data-selected:visible">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                <div>{model}</div>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </header>
      <div className="bg-black divide-y divide-neutral-800">
        <h2 className="text-neutral-500 p-2">Original Texts</h2>
        <TabGroup className="text-sm divide-y divide-neutral-800" selectedIndex={selectedIndex}>
          <TabPanels>
            {data.map(({ id, texts, policy }) => (
              <TabPanel className="divide-y divide-neutral-800" key={id}>
                <Textarea
                  className="block w-full resize-none p-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                  rows={12}
                  placeholder="Type original text..."
                  value={texts[0].text}
                  onChange={(e) => {
                    setData((prev) => prev.map((item) =>
                      item.id === id ? { ...item, texts: [{ text: e.target.value }, ...item.texts.slice(1)] } : item
                    ));
                  }}
                  required
                />
                <Textarea
                  className="block w-full resize-none p-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                  rows={4}
                  placeholder="Type policy..."
                  value={policy}
                  onChange={(e) => {
                    setData((prev) => prev.map((item) =>
                      item.id === id ? { ...item, policy: e.target.value } : item
                    ));
                  }}
                />
              </TabPanel>
            ))}
          </TabPanels>
          <div className="flex divide-x divide-neutral-800">
            <TabList className="flex flex-1 overflow-x-auto text-neutral-500 px-1">
              {data.map(({ id }, index) => (
                <Tab
                  className="min-w-8 text-center p-2 data-focus:text-neutral-200 outline-none data-hover:text-neutral-200 data-selected:text-neutral-200 data-selected:font-medium"
                  key={id}
                  onClick={() => {
                    setCurrentItemId(id);
                    setCurrentRedactedTextId(data.find(item => item.id === id).texts[1]?.id);
                  }}
                >
                  {index + 1}
                </Tab>
              ))}
            </TabList>
            <Menu>
              <MenuButton className="w-8 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              </MenuButton>
              <MenuItems
                transition
                anchor="bottom end"
                className="origin-top-right rounded-xl border border-neutral-800 bg-neutral-900 p-1 text-sm/6 transition duration-100 ease-out [--anchor-gap:--spacing(1)] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
              >
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    const id = crypto.randomUUID();
                    setData((prev) => [
                      ...prev,
                      { id, texts: [{ id: crypto.randomUUID(), text: "", label: "original" }], policy: "", qa: [], answers: {} },
                    ]);
                    setCurrentItemId(id);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Add blank text
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={async () => {
                    const originalText = await getOriginalText(apiKey, model);
                    const id = crypto.randomUUID();
                    setData((prev) => [
                      ...prev,
                      { id, texts: [{ id: crypto.randomUUID(), text: originalText, label: "original" }], policy: "", qa: [], answers: {} },
                    ]);
                    setCurrentItemId(id);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                    </svg>
                    Generate with LM
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    const fileInput = document.createElement("input");
                    fileInput.type = "file";
                    fileInput.accept = ".jsonl";
                    fileInput.onchange = (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target.result;
                        const lines = content.split("\n").filter(line => line.trim());
                        const newTexts = lines.map((line) => JSON.parse(line));
                        setData((prev) => [...prev, ...newTexts]);
                      };
                      reader.readAsText(file);
                    };
                    fileInput.click();
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                    </svg>
                    Upload jsonl file
                  </Button>
                </MenuItem>
              </MenuItems>
            </Menu>
            <Menu>
              <MenuButton className="w-8 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                </svg>
              </MenuButton>
              <MenuItems
                transition
                anchor="bottom end"
                className="origin-top-right rounded-xl border border-neutral-800 bg-neutral-900 p-1 text-sm/6 transition duration-100 ease-out [--anchor-gap:--spacing(1)] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
              >
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    if (data.length === 1) {
                      const id = crypto.randomUUID();
                      setData([{
                        id,
                        texts: [{ text: "" }],
                        policy: "",
                        qa: [],
                        answers: {},
                      }]);
                      setCurrentItemId(id);
                      return;
                    }
                    setData((prev) => prev.filter((item) => item.id !== currentItemId));
                    setCurrentItemId(prev => prev === data[0].id ? data[1].id : data[0].id);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M1 11.27c0-.246.033-.492.099-.73l1.523-5.521A2.75 2.75 0 0 1 5.273 3h9.454a2.75 2.75 0 0 1 2.651 2.019l1.523 5.52c.066.239.099.485.099.732V15a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3.73Zm3.068-5.852A1.25 1.25 0 0 1 5.273 4.5h9.454a1.25 1.25 0 0 1 1.205.918l1.523 5.52c.006.02.01.041.015.062H14a1 1 0 0 0-.86.49l-.606 1.02a1 1 0 0 1-.86.49H8.236a1 1 0 0 1-.894-.553l-.448-.894A1 1 0 0 0 6 11H2.53l.015-.062 1.523-5.52Z" clipRule="evenodd" />
                    </svg>
                    Delete current
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    const id = crypto.randomUUID();
                    setData([{
                      id,
                      texts: [{ text: "" }],
                      qa: [],
                      policy: "",
                      answers: {},
                    }]);
                    setCurrentItemId(id);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M1.045 6.954a2.75 2.75 0 0 1 .217-.678L2.53 3.58A2.75 2.75 0 0 1 5.019 2h9.962a2.75 2.75 0 0 1 2.488 1.58l1.27 2.696c.101.216.174.444.216.678A1 1 0 0 1 19 7.25v1.5a2.75 2.75 0 0 1-2.75 2.75H3.75A2.75 2.75 0 0 1 1 8.75v-1.5a1 1 0 0 1 .045-.296Zm2.843-2.736A1.25 1.25 0 0 1 5.02 3.5h9.962c.484 0 .925.28 1.13.718l.957 2.032H14a1 1 0 0 0-.86.49l-.606 1.02a1 1 0 0 1-.86.49H8.236a1 1 0 0 1-.894-.553l-.448-.894A1 1 0 0 0 6 6.25H2.932l.956-2.032Z" clipRule="evenodd" />
                      <path d="M1 14a1 1 0 0 1 1-1h4a1 1 0 0 1 .894.553l.448.894a1 1 0 0 0 .894.553h3.438a1 1 0 0 0 .86-.49l.606-1.02A1 1 0 0 1 14 13h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-2Z" />
                    </svg>
                    Delete all
                  </Button>
                </MenuItem>
              </MenuItems>
            </Menu>
            <Button className="w-8 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200" onClick={() => downloadFile("data.jsonl", data.map(item => JSON.stringify(item)).join("\n"))}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
            </Button>
          </div>
        </TabGroup>
      </div>
      <div className="bg-black divide-y divide-neutral-800 flex flex-col">
        <h2 className="text-neutral-500 p-2">Redacted Texts</h2>
        <TabGroup className="text-sm divide-y divide-neutral-800 flex-1 flex flex-col" selectedIndex={selectedRedactedTextIndex - 1}>
          <TabPanels className="flex-1">
            {currentItem.texts.slice(1).map(({ id, text, label }) => (
              <TabPanel className="divide-y divide-neutral-800" key={id}>
                <Textarea
                  className="block w-full resize-none p-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                  rows={15}
                  placeholder="Type original text..."
                  value={text}
                  onChange={(e) => {
                    setData((prev) => prev.map((item) => {
                      if (item.id !== currentItemId) return item;
                      return {
                        ...item,
                        texts: item.texts.map((t) => t.id === id ? { ...t, text: e.target.value } : t),
                      };
                    }));
                  }}
                  required
                />
                <Input
                  className="block w-full resize-none p-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                  rows={1}
                  placeholder="Type label..."
                  value={label}
                  onChange={(e) => {
                    setData((prev) => prev.map((item) => {
                      if (item.id !== currentItemId) return item;
                      return {
                        ...item,
                        texts: item.texts.map((t) => t.id === id ? { ...t, label: e.target.value } : t),
                      };
                    }));
                  }}
                />
              </TabPanel>
            ))}
          </TabPanels>
          <div className="flex divide-x divide-neutral-800">
            <TabList className="flex flex-1 overflow-x-auto text-neutral-500 px-1">
              {currentItem.texts.slice(1).map(({ id }, index) => (
                <Tab
                  className="min-w-8 text-center p-2 data-focus:text-neutral-200 outline-none data-hover:text-neutral-200 data-selected:text-neutral-200 data-selected:font-medium"
                  key={id}
                  onClick={() => setCurrentRedactedTextId(id)}
                >
                  {index + 1}
                </Tab>
              ))}
            </TabList>
            <Menu>
              <MenuButton className="w-8 py-2 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              </MenuButton>
              <MenuItems
                transition
                anchor="bottom end"
                className="origin-top-right rounded-xl border border-neutral-800 bg-neutral-900 p-1 text-sm/6 transition duration-100 ease-out [--anchor-gap:--spacing(1)] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
              >
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    const id = crypto.randomUUID();
                    setData((prev) => prev.map((item) => {
                      if (item.id !== currentItemId) return item;
                      return {
                        ...item,
                        texts: [...item.texts, { id, text: "", label: "" }],
                      };
                    }));
                    setCurrentRedactedTextId(id);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Add blank text
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    if (!apiKey) {
                      alert("Please set your OpenAI API key first.");
                      return;
                    }
                    getRedactedText(apiKey, model, currentItem.texts[0].text, currentItem.policy).then((redactedText) => {
                      const id = crypto.randomUUID();
                      setData((prev) => prev.map((item) => {
                        if (item.id !== currentItemId) return item;
                        return {
                          ...item,
                          texts: [...item.texts, { id, text: redactedText, label: "" }],
                        };
                      }));
                      setCurrentRedactedTextId(id);
                    });
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                    </svg>
                    Generate with LM
                  </Button>
                </MenuItem>
              </MenuItems>
            </Menu>
            {currentItem.texts.length > 1 && <Menu>
              <MenuButton className="w-8 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                </svg>
              </MenuButton>
              <MenuItems
                transition
                anchor="bottom end"
                className="origin-top-right rounded-xl border border-neutral-800 bg-neutral-900 p-1 text-sm/6 transition duration-100 ease-out [--anchor-gap:--spacing(1)] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
              >
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    setData((prev) => prev.map((item) => {
                      if (item.id !== currentItemId) return item;
                      delete item.answers[currentRedactedTextId];
                      return {
                        ...item,
                        texts: item.texts.filter((t) => t.id !== currentRedactedTextId),
                      };
                    }));
                    setCurrentRedactedTextId(prev => prev !== currentItem.texts[1].id ? currentItem.texts[1].id : currentItem.texts.length > 2 ? currentItem.texts[2].id : undefined);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M1 11.27c0-.246.033-.492.099-.73l1.523-5.521A2.75 2.75 0 0 1 5.273 3h9.454a2.75 2.75 0 0 1 2.651 2.019l1.523 5.52c.066.239.099.485.099.732V15a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3.73Zm3.068-5.852A1.25 1.25 0 0 1 5.273 4.5h9.454a1.25 1.25 0 0 1 1.205.918l1.523 5.52c.006.02.01.041.015.062H14a1 1 0 0 0-.86.49l-.606 1.02a1 1 0 0 1-.86.49H8.236a1 1 0 0 1-.894-.553l-.448-.894A1 1 0 0 0 6 11H2.53l.015-.062 1.523-5.52Z" clipRule="evenodd" />
                    </svg>
                    Delete current
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    setData((prev) => prev.map((item) => {
                      if (item.id !== currentItemId) return item;
                      return {
                        ...item,
                        texts: item.texts.slice(0, 1),
                        answers: {
                          [item.texts[0].id]: item.answers[item.texts[0].id],
                        },
                      };
                    }));
                    setCurrentRedactedTextId(undefined);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M1.045 6.954a2.75 2.75 0 0 1 .217-.678L2.53 3.58A2.75 2.75 0 0 1 5.019 2h9.962a2.75 2.75 0 0 1 2.488 1.58l1.27 2.696c.101.216.174.444.216.678A1 1 0 0 1 19 7.25v1.5a2.75 2.75 0 0 1-2.75 2.75H3.75A2.75 2.75 0 0 1 1 8.75v-1.5a1 1 0 0 1 .045-.296Zm2.843-2.736A1.25 1.25 0 0 1 5.02 3.5h9.962c.484 0 .925.28 1.13.718l.957 2.032H14a1 1 0 0 0-.86.49l-.606 1.02a1 1 0 0 1-.86.49H8.236a1 1 0 0 1-.894-.553l-.448-.894A1 1 0 0 0 6 6.25H2.932l.956-2.032Z" clipRule="evenodd" />
                      <path d="M1 14a1 1 0 0 1 1-1h4a1 1 0 0 1 .894.553l.448.894a1 1 0 0 0 .894.553h3.438a1 1 0 0 0 .86-.49l.606-1.02A1 1 0 0 1 14 13h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-2Z" />
                    </svg>
                    Delete all
                  </Button>
                </MenuItem>
              </MenuItems>
            </Menu>}
          </div>
        </TabGroup>
      </div>
      <div className="bg-black divide-y divide-neutral-800">
        <div className="text-neutral-500 flex divide-x divide-neutral-800">
          <p className="p-2 flex-1">Question</p>
          <p className="p-2 w-32 shrink-0">Answer</p>
          <Popover className="flex items-center justify-center w-8 shrink-0">
            <PopoverButton className="outline-none hover:text-neutral-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M10.339 2.237a.531.531 0 0 0-.678 0 11.947 11.947 0 0 1-7.078 2.75.5.5 0 0 0-.479.425A12.11 12.11 0 0 0 2 7c0 5.163 3.26 9.564 7.834 11.257a.48.48 0 0 0 .332 0C14.74 16.564 18 12.163 18 7c0-.538-.035-1.069-.104-1.589a.5.5 0 0 0-.48-.425 11.947 11.947 0 0 1-7.077-2.75ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </PopoverButton>
            <PopoverPanel
              transition
              anchor="top"
              className="px-4 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-sm transition duration-200 ease-in-out [--anchor-gap:--spacing(1)] data-closed:translate-y-1 data-closed:opacity-0"
            >Should redact?</PopoverPanel>
          </Popover>
          <Popover className="flex items-center justify-center w-8 shrink-0">
            <PopoverButton className="outline-none hover:text-neutral-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
              </svg>
            </PopoverButton>
            <PopoverPanel
              transition
              anchor="top"
              className="px-4 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-sm transition duration-200 ease-in-out [--anchor-gap:--spacing(1)] data-closed:translate-y-1 data-closed:opacity-0"
            >Delete</PopoverPanel>
          </Popover>
        </div>
        <ul className="divide-y divide-neutral-800 text-sm">
          {currentItem.qa.map(({ id, q, a, redact }) => (
            <li key={id} className="flex divide-x divide-neutral-800">
              <Textarea
                className="flex-1 resize-none p-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                rows={3}
                placeholder="Type question..."
                value={q}
                onChange={(e) => {
                  setData((prev) => prev.map((item) => {
                    if (item.id !== currentItemId) return item;
                    Object.keys(item.answers).forEach((key) => delete item.answers[key][id]);
                    return { ...item, qa: item.qa.map((q) => q.id === id ? { ...q, q: e.target.value } : q) };
                  }));
                }}
                required
              />
              <Textarea
                className="w-32 resize-none p-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                rows={3}
                placeholder="Type answer..."
                value={a}
                onChange={(e) => {
                  setData((prev) => prev.map((item) => {
                    if (item.id !== currentItemId) return item;
                    Object.keys(item.answers).forEach((key) => delete item.answers[key][id]);
                    return { ...item, qa: item.qa.map((q) => q.id === id ? { ...q, a: e.target.value } : q) };
                  }));
                }}
                required
              />
              <div className="flex items-center justify-center w-8 shrink-0">
                <Checkbox
                  checked={redact}
                  onChange={(checked) => {
                    setData((prev) => prev.map((item) => {
                      if (item.id !== currentItemId) return item;
                      return { ...item, qa: item.qa.map((q) => q.id === id ? { ...q, redact: checked } : q) };
                    }));
                  }}
                  className="group size-5 rounded-md bg-neutral-900 p-0.5 ring-1 ring-neutral-800 ring-inset focus:not-data-focus:outline-none data-checked:bg-neutral-200 data-focus:outline data-focus:outline-offset-2 data-focus:outline-neutral-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="hidden size-4 fill-black group-data-checked:block">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                </Checkbox>
              </div>
              <div className="flex items-center justify-center w-8 shrink-0">
                <Button className="text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200" onClick={() => {
                  setData((prev) => prev.map((item) =>
                    item.id === currentItemId ? { ...item, qa: item.qa.filter((q) => q.id !== id) } : item
                  ));
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                  </svg>
                </Button>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-center">
            <Menu>
              <MenuButton className="w-8 py-2 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              </MenuButton>
              <MenuItems
                transition
                anchor="top"
                className="origin-bottom rounded-xl border border-neutral-800 bg-neutral-900 p-1 text-sm/6 transition duration-100 ease-out [--anchor-gap:--spacing(1)] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
              >
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={() => {
                    setData((prev) => prev.map((item) =>
                      item.id === currentItemId ? { ...item, qa: [...item.qa, { id: crypto.randomUUID(), q: "", a: "", redact: false }] } : item
                    ));
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Add blank question
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-focus:bg-white/10" onClick={async () => {
                    const qa = await getQA(apiKey, model, currentItem.texts[0].text);
                    qa.forEach((q) => q.id = crypto.randomUUID());
                    setData((prev) => prev.map((item) =>
                      item.id === currentItemId ? { ...item, qa: [...item.qa, ...qa] } : item
                    ));
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                    </svg>
                    Generate with LM
                  </Button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </li>
        </ul>
      </div>
      <div className="bg-black divide-y divide-neutral-800">
        <div className="text-neutral-500 flex divide-x divide-neutral-800">
          <p className="p-2 flex-1">Answer</p>
          <Input type="number" max={1} min={0} step={0.1} placeholder="threshold (0-1)" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} required className="px-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25" />
          <Popover className="flex items-center justify-center w-8 shrink-0">
            <PopoverButton className="outline-none hover:text-neutral-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </PopoverButton>
            <PopoverPanel
              transition
              anchor="top"
              className="px-4 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-sm transition duration-200 ease-in-out [--anchor-gap:--spacing(1)] data-closed:translate-y-1 data-closed:opacity-0"
            >Verified?</PopoverPanel>
          </Popover>
        </div>
        <ul className="divide-y divide-neutral-800 text-sm">
          {currentItem.qa.map(({ id }) => (
            <li key={id} className="flex divide-x divide-neutral-800">
              <Textarea
                className="flex-1 resize-none p-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                rows={3}
                placeholder="Not answered yet..."
                value={currentItem.answers[currentItem.texts[0].id]?.[id]?.value || ""}
                required
                disabled
              />
              <div className="flex items-center justify-center w-8 shrink-0">
                <Button className="w-8 py-2 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200" onClick={async () => {
                  const answer = await getAnswer(apiKey, model, currentItem.texts[0].text, currentItem.qa.find(q => q.id === id)?.q || "");
                  setData((prev) => prev.map((item) => {
                    if (item.id !== currentItemId) return item;
                    return {
                      ...item,
                      answers: {
                        ...item.answers,
                        [currentItem.texts[0].id]: {
                          ...item.answers[currentItem.texts[0].id],
                          [id]: {
                            value: answer,
                          },
                        },
                      },
                    };
                  }));
                  const score = await getEquality(apiKey, model, answer, currentItem.qa.find(q => q.id === id)?.a || "");
                  setData((prev) => prev.map((item) => {
                    if (item.id !== currentItemId) return item;
                    return {
                      ...item,
                      answers: {
                        ...item.answers,
                        [currentItem.texts[0].id]: {
                          ...item.answers[currentItem.texts[0].id],
                          [id]: {
                            value: answer,
                            score,
                          },
                        },
                      },
                    };
                  }));
                }}>
                  {currentItem.answers[currentItem.texts[0].id]?.[id]?.score === undefined ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
                    </svg>
                  ) : currentItem.answers[currentItem.texts[0].id]?.[id]?.score >= threshold ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-red-500">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  )}
                </Button>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-center">
            <Button className="w-8 py-2 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200" onClick={() => {
              Promise.all(currentItem.qa.map(async ({ id }) => {
                const answer = await getAnswer(apiKey, model, currentItem.texts[0].text, currentItem.qa.find(q => q.id === id)?.q || "");
                setData((prev) => prev.map((item) => {
                  if (item.id !== currentItemId) return item;
                  return {
                    ...item,
                    answers: {
                      ...item.answers,
                      [currentItem.texts[0].id]: {
                        ...item.answers[currentItem.texts[0].id],
                        [id]: {
                          value: answer,
                        },
                      },
                    },
                  };
                }));
                const score = await getEquality(apiKey, model, answer, currentItem.qa.find(q => q.id === id)?.a || "");
                setData((prev) => prev.map((item) => {
                  if (item.id !== currentItemId) return item;
                  return {
                    ...item,
                    answers: {
                      ...item.answers,
                      [currentItem.texts[0].id]: {
                        ...item.answers[currentItem.texts[0].id],
                        [id]: {
                          value: answer,
                          score,
                        },
                      },
                    },
                  };
                }));
              }));
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
              </svg>
            </Button>
          </li>
        </ul>
      </div>
      <div className="bg-black divide-y divide-neutral-800">
        <div className="text-neutral-500 flex divide-x divide-neutral-800">
          <p className="p-2 flex-1">Answer (Score: {getScore(currentItem, currentRedactedTextId, threshold).toFixed(2)})</p>
          <Popover className="flex items-center justify-center w-8 shrink-0">
            <PopoverButton className="outline-none hover:text-neutral-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </PopoverButton>
            <PopoverPanel
              transition
              anchor="top"
              className="px-4 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-sm transition duration-200 ease-in-out [--anchor-gap:--spacing(1)] data-closed:translate-y-1 data-closed:opacity-0"
            >Verified?</PopoverPanel>
          </Popover>
        </div>
        <ul className="divide-y divide-neutral-800 text-sm">
          {selectedRedactedTextIndex >= 0 && <>
            {currentItem.qa.map(({ id }) => (
              <li key={id} className="flex divide-x divide-neutral-800">
                <Textarea
                  className="flex-1 resize-none p-2 focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                  rows={3}
                  placeholder="Not answered yet..."
                  value={currentItem.answers[currentItem.texts[selectedRedactedTextIndex].id]?.[id]?.value || ""}
                  required
                  disabled
                />
                <div className="flex items-center justify-center w-8 shrink-0">
                  <Button className="w-8 py-2 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200" onClick={async () => {
                    const answer = await getAnswer(apiKey, model, currentItem.texts[selectedRedactedTextIndex].text, currentItem.qa.find(q => q.id === id)?.q || "");
                    setData((prev) => prev.map((item) => {
                      if (item.id !== currentItemId) return item;
                      return {
                        ...item,
                        answers: {
                          ...item.answers,
                          [currentItem.texts[selectedRedactedTextIndex].id]: {
                            ...item.answers[currentItem.texts[selectedRedactedTextIndex].id],
                            [id]: {
                              value: answer,
                            },
                          },
                        },
                      };
                    }));
                    const score = await getEquality(apiKey, model, answer, currentItem.qa.find(q => q.id === id)?.a || "");
                    setData((prev) => prev.map((item) => {
                      if (item.id !== currentItemId) return item;
                      return {
                        ...item,
                        answers: {
                          ...item.answers,
                          [currentItem.texts[selectedRedactedTextIndex].id]: {
                            ...item.answers[currentItem.texts[selectedRedactedTextIndex].id],
                            [id]: {
                              value: answer,
                              score,
                            },
                          },
                        },
                      };
                    }));
                  }}>
                    {currentItem.answers[currentItem.texts[selectedRedactedTextIndex].id]?.[id]?.score === undefined ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
                      </svg>
                    ) : currentItem.answers[currentItem.texts[selectedRedactedTextIndex].id]?.[id]?.score >= threshold ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-red-500">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    )}
                  </Button>
                </div>
              </li>
            ))}
            <li className="flex items-center justify-center">
              <Button className="w-8 py-2 flex justify-center items-center text-neutral-500 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-neutral-500 data-focus:text-neutral-200 data-active:text-neutral-200 data-hover:text-neutral-200" onClick={() => Promise.all(currentItem.qa.map(async ({ id }) => {
                const answer = await getAnswer(apiKey, model, currentItem.texts[selectedRedactedTextIndex].text, currentItem.qa.find(q => q.id === id)?.q || "");
                setData((prev) => prev.map((item) => {
                  if (item.id !== currentItemId) return item;
                  return {
                    ...item,
                    answers: {
                      ...item.answers,
                      [currentItem.texts[selectedRedactedTextIndex].id]: {
                        ...item.answers[currentItem.texts[selectedRedactedTextIndex].id],
                        [id]: {
                          value: answer,
                        },
                      },
                    },
                  };
                }));
                const score = await getEquality(apiKey, model, answer, currentItem.qa.find(q => q.id === id)?.a || "");
                setData((prev) => prev.map((item) => {
                  if (item.id !== currentItemId) return item;
                  return {
                    ...item,
                    answers: {
                      ...item.answers,
                      [currentItem.texts[selectedRedactedTextIndex].id]: {
                        ...item.answers[currentItem.texts[selectedRedactedTextIndex].id],
                        [id]: {
                          value: answer,
                          score,
                        },
                      },
                    },
                  };
                }));
              }))}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
                </svg>
              </Button>
            </li>
          </>}
        </ul>
      </div>
    </main>
  )
}

export default App
