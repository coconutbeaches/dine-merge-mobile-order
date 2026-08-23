import React from 'react';

type PopupMessageTextProps = {
  message: string;
};

function renderInlineMarkdown(text: string, lineIndex: number) {
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, partIndex) => {
    const key = `${lineIndex}-${partIndex}`;

    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      return (
        <strong key={key} className="font-semibold">
          <em>{part.slice(3, -3)}</em>
        </strong>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export default function PopupMessageText({ message }: PopupMessageTextProps) {
  const lines = message.replace(/\r\n?/g, '\n').split('\n');

  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {index > 0 && <br />}
          {renderInlineMarkdown(line, index)}
        </React.Fragment>
      ))}
    </>
  );
}
