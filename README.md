# ClassNotes

A modern, responsive website for sharing and viewing PDFs with classmates, designed for GitHub Pages hosting.

## Features

- 📚 Browse PDFs by category (Math, Science, History, English)
- 🔍 Search functionality across titles, descriptions, and authors
- 👀 Built-in PDF viewer modal
- 🔗 Generate shareable links for individual PDFs
- 📱 Fully responsive design for mobile and desktop
- 🎨 Modern, clean UI with smooth animations
- 📋 One-click link copying to clipboard

## Setup Instructions

### 1. Fork/Clone this repository

### 2. Add your PDF files

- Create a `pdf` folder in your repository root
- Upload all your PDF files to this folder
- Make sure filenames match what you specify in the database

### 3. Update the PDF database

Open `script.js` and update the `pdfDatabase` array with your PDFs:

```javascript
const pdfDatabase = [
  {
    id: 1,
    title: "Your PDF Title",
    filename: "your-pdf-file.pdf", // Must match actual filename in /pdf/ folder
    category: "math", // math, science, history, english
    description: "Brief description of the PDF content",
    uploadDate: "2025-01-15", // YYYY-MM-DD format
    author: "Author Name",
  },
  // Add more PDFs here...
];
```

### 4. Deploy to GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages" section
3. Select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

Your site will be available at: `https://yourusername.github.io/your-repo-name`

## Adding New PDFs

To add a new PDF:

1. Upload the PDF file to the `/pdf/` folder in your repository
2. Add a new entry to the `pdfDatabase` array in `script.js`
3. Commit and push your changes

The website will automatically update with the new PDF.

## Categories

The platform supports these categories:

- **Math** - Mathematics, Algebra, Calculus, etc.
- **Science** - Biology, Chemistry, Physics, etc.
- **History** - Historical documents, timelines, etc.
- **English** - Literature, Grammar, Writing, etc.

You can easily add new categories by:

1. Adding them to the navigation in `index.html`
2. Adding corresponding icons in the `categoryIcons` object in `script.js`

## Sharing PDFs

Each PDF gets a unique shareable link in the format:
`https://yourdomain.com?pdf=ID`

When someone visits this link, the PDF will automatically open in the viewer.

## Mobile Support

The website is fully responsive and works great on:

- Desktop computers
- Tablets
- Mobile phones

## Browser Support

Works on all modern browsers:

- Chrome
- Firefox
- Safari
- Edge

## File Structure

```
├── index.html          # Main webpage
├── style.css           # All styling
├── script.js           # JavaScript functionality
├── pdf/                # PDF files directory
│   ├── file1.pdf
│   ├── file2.pdf
│   └── ...
└── README.md           # This file
```

## Customization

You can customize:

- **Colors**: Update CSS variables in `:root` section of `style.css`
- **Categories**: Add new categories in navigation and JavaScript
- **Styling**: Modify the CSS to match your preferred design
- **Functionality**: Add new features by extending the JavaScript

## Tips

- Keep PDF filenames simple (no spaces, special characters)
- Use descriptive titles and descriptions for better searchability
- Organize PDFs by subject for easier navigation
- Update the database regularly when adding new content

## Support

If you encounter any issues:

1. Check that PDF filenames in the database match actual files
2. Ensure all files are properly uploaded to the `/pdf/` folder
3. Verify GitHub Pages is enabled and working

## License

This project is open source and available under the MIT License.
