let selectedElementId = null; 
let generatedElements = {}; 
let chatHistory = []; 
let undoStack = [];
let redoStack = [];
const submitButton = document.getElementById("submitButton");

document.getElementById("user-input").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {  
        event.preventDefault();
        submitButton.click();  
    }
});

const style = document.createElement("style");
style.innerHTML = `
    .selected {
        outline: 3px solid red !important;
        background-color: rgba(255, 0, 0, 0.2);
    }
    .tablinks.active {
        background-color: #ddd;
    }
    .tabcontent {
        padding: 20px;
        border: 1px solid #ccc;
    }
`;
document.head.appendChild(style);

function selectElement(element) {
    // Empêcher la sélection des boutons ou zones de contrôle
    if (element.tagName === "BUTTON" || element.closest(".control-buttons")) {
        return; 
    }

    // Désélectionner
    if (selectedElementId !== null && selectedElementId !== element.id) {
        const previousElement = document.getElementById(selectedElementId);
        if (previousElement) {
            previousElement.classList.remove("selected");
            previousElement.contentEditable = "false";
            previousElement.onblur = null;
        }
    }

    // Donner un id unique s’il n’en a pas
    if (!element.id) {
        element.id = "element-" + Date.now();
    }

    // Sélectionner le nouvel élément
    element.classList.add("selected");
    element.contentEditable = "true";
    element.focus();

    // Sauvegarder les modifications 
    element.onblur = () => {
        undoStack.push(document.getElementById("generated").innerHTML);
        redoStack = [];

        element.contentEditable = "false";
        element.classList.remove("selected");

        if (typeof generatedElements !== "undefined") {
            generatedElements[element.id] = element.outerHTML;
            console.log("Contenu modifié sauvegardé :", generatedElements[element.id]);
        }
    };

    selectedElementId = element.id;

    // Sauvegarder l'état initial si pas déjà fait
    if (typeof generatedElements !== "undefined" && !generatedElements[element.id]) {
        generatedElements[element.id] = element.outerHTML;
    }

    console.log("Élément sélectionné :", selectedElementId);
}


document.addEventListener("click", function(event) {
    const clicked = event.target;

    // Si c’est un bouton ou un contrôle : ignorer
    if (clicked.closest(".control-buttons") || clicked.tagName === "BUTTON") return;

    // Si l'élément cliqué est "generated", on le sélectionne
    if (clicked.classList.contains("generated")) {
        selectElement(clicked);
        event.stopPropagation();
    } else {
        // Sinon, on désélectionne l’actuel
        if (selectedElementId) {
            const previous = document.getElementById(selectedElementId);
            if (previous) {
                previous.classList.remove("selected");
                previous.contentEditable = "false";
                previous.onblur = null;
            }
            selectedElementId = null;
        }
    }
});





// Fonction principale
async function sendMessage() {
    let userInput = document.getElementById("user-input").value;
    if (!userInput) {
        alert("Veuillez entrer une instruction.");
        return;
    }

  
    let userRequest = {
        role: "user",
        content: `Here is the current HTML of the selected element: ${generatedElements[selectedElementId]}`
    };
    chatHistory.push(userRequest);

    userRequest = {
        role: "user",
        content: userInput
    };
    chatHistory.push(userRequest);

    llmResponse =  { role: "system", content: `You are an AI assistant specialized in generating and modifying structured HTML user interfaces for business management systems. Your task is to help the user generate structured UI components and return them as raw HTML code, without explanations. The UI must follow a structured, enterprise-style layout similar to customer management systems.

        General Rules:
        - Always generate structured sections with clear headings using <div> elements, ensuring readability and a professional look.
        - Maintain semantic structure (e.g., <table>, <tr>, <td>, <ul>, <li>, <form>).
        - All modifications should preserve the existing layout while changing only the requested elements.
        
        Modifications & Editing Rules:
        When modifying an element, follow these guidelines:
        
        1️ Direct Element Modification (Inside the Element):
        If the user requests a change inside a specific element, modify only its content, keeping its structure intact.
        
        Example:
        User selects:
        <td id="row1-id">12345</td>
        User requests: "Change ID from 12345 to 67890."
        Your Output:
        <td id="row1-id">67890</td>
        
        2️ Parent Element Modification (Affecting Surrounding Structure):
        If the request implies a change that affects a parent element (e.g., adding/removing elements within a table row), modify the parent while keeping the structure intact.
        
        Example:
        User selects:
        <tr id="row1">
            <td>ID</td>
            <td>12345</td>
            <td>Active</td>
        </tr>
        User requests: "Change status to Inactive."
        Your Output:
        <tr id="row1">
            <td>ID</td>
            <td>12345</td>
            <td>Inactive</td>
        </tr>
        
        3️ Replacing or Reordering Elements:
        If the user requests a structural change (e.g., reordering columns, swapping rows), update the layout accordingly.
        
        Example:
        User selects:
        <tr>
            <td>John Doe</td>
            <td>Manager</td>
            <td>HR</td>
        </tr>
        User requests: "Move 'HR' before 'Manager'."
        Your Output:
        <tr>
            <td>John Doe</td>
            <td>HR</td>
            <td>Manager</td>
        </tr>
        
        4️ Adding or Removing Elements:
        If the user requests an addition or deletion, update only the required section.
        
        Example (Adding a Column):
        User selects:
        <tr>
            <td>John Doe</td>
            <td>HR</td>
        </tr>
        User requests: "Add a new column for Department Head with 'Yes'."
        Your Output:
        <tr>
            <td>John Doe</td>
            <td>HR</td>
            <td>Yes</td>
        </tr>
        
        UI Component Rules:
        Tables:
        Generate structured tables with clear headers and properly formatted rows:
        <table border="1">
            <tr>
                <th>ID Type</th>
                <th>ID Number</th>
                <th>Country Code</th>
            </tr>
            <tr>
                <td>Passport</td>
                <td>987654321</td>
                <td>USA</td>
            </tr>
        </table>
        
        Forms:
        Ensure labeled inputs with label, input, and select elements:
        <form>
            <label for="clientName">Client Name:</label>
            <input type="text" id="clientName" placeholder="Enter name">
        </form>
        
        Buttons:
        Generate business-oriented buttons:
        <button type="button" onclick="saveClient()">Save Client</button>
        
        Expected Output:
        - Always return only raw HTML (no explanations).
        - Ensure modifications match the requested scope (inside an element or affecting a parent).
        - Maintain the original structure while making precise changes.
        
        `  }
    
        chatHistory.push(llmResponse);
        userRequest = { role: "user", content: `Here is the current HTML of the selected element: ${generatedElements[selectedElementId]}` }
        chatHistory.push(userRequest);

     try {
        let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer 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"
            },
            body: JSON.stringify({
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                messages: chatHistory 
            })
        });

        let data = await response.json();

        if (data.error) {
            console.error("Error from API:", data.error);
            alert("API Error: " + data.error.message);
            return;
        }

        if (data.choices && data.choices.length > 0) {
            let generatedHtml = data.choices[0].message.content;
            console.log("HTML généré reçu :", generatedHtml);
            
           // Store the LLM response
           let llmResponse = {
            role: "assistant",
            content: generatedHtml
        };
        let container = document.getElementById("generated");
        undoStack.push(container.innerHTML);
        redoStack = [];
        container.innerHTML = generatedHtml;  
        
       
        container.querySelectorAll(".generated, td, .tablinks, .tabcontent").forEach(el => {
            el.onclick = (event) => {
                event.stopPropagation();
                selectElement(el);
            };
        });

        // Extraire et réinjecter les scripts
        const scripts = container.querySelectorAll('script');
        const scriptContents = [];

        scripts.forEach(script => {
            scriptContents.push(script.textContent);
            script.remove(); 
        });

        scriptContents.forEach(code => {
            const scriptTag = document.createElement('script');
            scriptTag.textContent = code;
            document.body.appendChild(scriptTag);
        });

    } else {
        alert("L'IA n'a pas renvoyé une génération valide.");
    }

    document.getElementById("user-input").value = "";

} catch (error) {
    console.error("Erreur de communication avec l'IA:", error);
    alert("Erreur de communication avec l'IA.");
}
}


function undo() {
    if (undoStack.length > 0) {
        const container = document.getElementById("generated");
        redoStack.push(container.innerHTML); // sauvegarde l’état actuel dans redo
        const previousState = undoStack.pop();
        container.innerHTML = previousState;
        console.log("Undo effectué");
    } else {
        alert("Aucune action à annuler.");
    }
}
function redo() {
    if (redoStack.length > 0) {
        const container = document.getElementById("generated");
        undoStack.push(container.innerHTML); // sauvegarde l’état actuel dans undo
        const nextState = redoStack.pop();
        container.innerHTML = nextState;
        console.log("Redo effectué");
    } else {
        alert("Aucune action à rétablir.");
    }
}


function exportHtml(fileName) {
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${fileName}</title>
</head>
<body>
    ${document.getElementById("generated").innerHTML}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName.endsWith(".html") ? fileName : fileName + ".html";
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 100);
  }

  function loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        
       
        const importedContent = doc.body.innerHTML;
        
        
        const container = document.getElementById("generated");
        container.innerHTML = importedContent;

        
        const scripts = container.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.body.appendChild(newScript);
            script.remove();
        });
    };
    reader.readAsText(file);
}
let inlineEditor = null;
let originalContent = null;

//  marque l'élément comme sélectionné
document.getElementById("generated").addEventListener("click", function (e) {
    document.querySelectorAll("#generated .selected").forEach(el => el.classList.remove("selected"));
    e.target.classList.add("selected");
});

// ouvre l'éditeur inline
document.getElementById("generated").addEventListener("dblclick", function (event) {
    const target = event.target;

    if (inlineEditor || !target.innerText.trim()) return;

    const element = target;
    originalContent = element.innerHTML;

    // Création de l’éditeur
    inlineEditor = document.createElement("div");
    inlineEditor.style.position = "absolute";
    inlineEditor.style.zIndex = 10000;
    inlineEditor.style.background = "#f9f9f9";
    inlineEditor.style.border = "1px solid #ccc";
    inlineEditor.style.padding = "10px";
    inlineEditor.style.borderRadius = "8px";
    inlineEditor.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";

    const rect = element.getBoundingClientRect();
    inlineEditor.style.top = `${window.scrollY + rect.top}px`;
    inlineEditor.style.left = `${window.scrollX + rect.left}px`;

    // Zone de texte
    const textarea = document.createElement("textarea");
    textarea.value = element.innerText;
    textarea.rows = 4;
    textarea.cols = 40;
    textarea.style.width = "100%";
    textarea.style.boxSizing = "border-box";
    textarea.style.marginBottom = "8px";

    // Bouton Valider
    const validateBtn = document.createElement("button");
    validateBtn.textContent = "✅ Valider";
    validateBtn.style.marginRight = "8px";
    validateBtn.onclick = function () {
        element.innerText = textarea.value;
        cleanupInlineEditor();
    };

    // Bouton Annuler
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "❌ Annuler";
    cancelBtn.onclick = function () {
        element.innerHTML = originalContent;
        cleanupInlineEditor();
    };

    inlineEditor.appendChild(textarea);
    inlineEditor.appendChild(validateBtn);
    inlineEditor.appendChild(cancelBtn);
    document.body.appendChild(inlineEditor);
});

// Nettoie l'éditeur après validation ou annulation
function cleanupInlineEditor() {
    if (inlineEditor) {
        inlineEditor.remove();
        inlineEditor = null;
        originalContent = null;
    }
}
document.addEventListener("click", (e) => {
    if (e.target.id) {
        selectedElementId = e.target.id;
    } else {
        selectedElementId = null;
    }
});

// Bouton "Supprimer"
document.getElementById("deleteElementBtn").addEventListener("click", () => {
    if (selectedElementId) {
        const el = document.getElementById(selectedElementId);
        if (el) {
            undoStack.push(document.getElementById("generated").innerHTML);
            redoStack = [];

            el.remove();
            selectedElementId = null;
        }
    } else {
        alert("Aucun élément sélectionné !");
    }
});


// Bouton "Dupliquer"
document.getElementById("duplicateElementBtn").addEventListener("click", () => {
    if (selectedElementId) {
        const el = document.getElementById(selectedElementId);
        if (el) {
            // Sauvegarder l'état pour undo
            undoStack.push(document.getElementById("generated").innerHTML);
            redoStack = [];

            // Cloner l'élément avec son contenu et ses enfants
            const clone = el.cloneNode(true);
            
            // Générer un nouvel ID unique
            const newId = "element-" + Date.now() + "-copy";
            clone.id = newId;

            // Ajouter classe "generated" si nécessaire
            if (!clone.classList.contains("generated")) {
                clone.classList.add("generated");
            }

            // Ajouter l'élément cloné 
            el.insertAdjacentElement("afterend", clone);

            //  Enregistrer le nouvel élément
            generatedElements[newId] = clone.outerHTML;

            // Ajouter le gestionnaire d'événement
            clone.onclick = (event) => {
                event.stopPropagation();
                selectElement(clone);
            };

            //  Désélectionner l'original et sélectionner la copie
            if (selectedElementId) {
                const previous = document.getElementById(selectedElementId);
                if (previous) {
                    previous.classList.remove("selected");
                    previous.contentEditable = "false";
                    previous.onblur = null;
                }
            }
            selectElement(clone);

            console.log("Élément dupliqué :", newId);
        }
    } else {
        alert("Aucun élément sélectionné !");
    }
});
