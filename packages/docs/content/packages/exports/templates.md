# Templates

The exports package supports template-based rendering for PDF, Excel, and CSV exports.

## Template Files

Place HTML template files in a `templates/` directory at your project root.

```html
<!-- templates/invoice.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>{{ title }}</h1>
  <p>Amount: {{ amount }}</p>
  <p>Date: {{ date }}</p>
</body>
</html>
```

## Variable Interpolation

Variables are interpolated using delimiters. The default is `{{ }}`.

```typescript
const pdf = await toPDFFromTemplate("invoice.html", {
  title: "Invoice #1234",
  amount: "$99.00",
});
```

## Custom Delimiters

You can use custom delimiter pairs:

```typescript
const pdf = await toPDFFromTemplate("invoice.html", data, {
  delimiters: ["<%", "%>"],
});
```

Now your template would use `<% variable %>` instead of `{{ variable }}`.
