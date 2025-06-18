import * as chrono from 'chrono-node';

interface ParsedEvent {
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export function parseEventPrompt(prompt: string): ParsedEvent | null {
  // 1. Extract date/time range using chrono
  const results = chrono.parse(prompt);
  if (!results.length) return null;

  const result = results[0];
  const dateObj = result.start.date();
  const date = dateObj.toISOString().split('T')[0];

  let startTime = '';
  let endTime = '';

  // 2. If prompt contains "from ... to ...", try to extract those times directly
  const timeRangeMatch = prompt.match(/from\s+(\d{1,2}(?::\d{2})?\s*(am|pm)?)\s+to\s+(\d{1,2}(?::\d{2})?\s*(am|pm)?)/i);
  if (timeRangeMatch) {
    const startParsed = chrono.parseDate(timeRangeMatch[1], dateObj);
    const endParsed = chrono.parseDate(timeRangeMatch[3], dateObj);
    if (startParsed && endParsed) {
      startTime = startParsed.toTimeString().slice(0, 5);
      endTime = endParsed.toTimeString().slice(0, 5);
    }
  } else {
    if (result.start.isCertain('hour')) {
      startTime = dateObj.toTimeString().slice(0, 5);
    }
    if (result.end) {
      endTime = result.end.date().toTimeString().slice(0, 5);
    }
  }

  // 3. Clean out chrono-detected text for title/desc extraction
  let cleaned = prompt.replace(result.text, '').replace(/create|add|reminder/gi, '').trim();

  // 4. Extract location (e.g., "in Hospital" or "at Clinic")
  let location: string | undefined;
  const locationMatch = cleaned.match(/\b(?:at|in)\s+([^\d,\.]+)$/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
    cleaned = cleaned.replace(locationMatch[0], '').trim();
  }

  // 5. Extract title + description
  const [title, ...descArr] = cleaned.split(' ');
  const titleStr = title ? title + (descArr[0] ? ' ' + descArr[0] : '') : 'Untitled Event';
  const description = descArr.slice(1).join(' ');

  return {
    title: titleStr.trim(),
    description: description.trim(),
    date,
    startTime,
    endTime,
    location,
  };
}
