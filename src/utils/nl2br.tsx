import React from 'react';

export function nl2br(text: string) {
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      <br />
    </React.Fragment>
  ));
}

// This function takes a string of text containing newline characters (\n) 
// and converts each newline into an HTML line break tag (<br />), making 
// the line breaks visible on the webpage.

/* 1) The .split('\n') method takes the input string and splits it into an array of smaller strings,
      using the newline character \n as the separator.
*/

/*
    2) .map((line, i) => ...) : The .map() function then iterates over this new array. 
                                For each item (each line of text), it will run the code inside and create a new React element.
                                The i is the index of the item in the array (0 for 'Hello', 1 for 'World').

/*
  <React.Fragment>: This is a special React component that lets you group a list of elements
                    together without adding an extra container <div> to the HTML. It keeps the final HTML clean.
  
  key={i}: When creating a list of elements in React, you must provide a unique key for each item.
           This helps React efficiently update the list if it changes. Here, we're just using the
           line's index (0, 1, 2, etc.) as the key.
  
  {line}: This renders the actual text of the line (e.g., "Hello").
  
  <br />: This renders a standard HTML line break tag right after the line of text.
*/