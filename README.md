<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Word-by-Word Script Reader</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f4f9;
            color: #333;
            transition: background-color 0.3s, color 0.3s;
        }
        body.dark-mode {
            background-color: #333;
            color: #fff;
        }
        #text-input {
            width: 80%;
            height: 100px;
            margin-bottom: 20px;
            padding: 10px;
            font-size: 16px;
            border: 2px solid #ccc;
            border-radius: 5px;
            background-color: #fff;
            color: #333;
            transition: background-color 0.3s, color 0.3s, border-color 0.3s;
        }
        .dark-mode #text-input {
            background-color: #444;
            color: #fff;
            border-color: #666;
        }
        #go-button, #theme-toggle {
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            margin: 5px;
            transition: background-color 0.3s;
        }
        #go-button:hover, #theme-toggle:hover {
            background-color: #0056b3;
        }
        #word-display {
            font-size: 48px;
            font-weight: bold;
            margin: 20px 0;
            color: #333;
            transition: color 0.3s;
            position: absolute; /* Make the word display draggable */
            cursor: grab; /* Change cursor to indicate draggable */
            user-select: none; /* Prevent text selection while dragging */
            top: 20%; /* Position above the text input field */
        }
        .dark-mode #word-display {
            color: #fff;
        }
        #speed-slider {
            width: 200px;
            margin-top: 20px;
        }
        #speed-label, #progress-label {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
            transition: color 0.3s;
        }
        .dark-mode #speed-label, .dark-mode #progress-label {
            color: #ccc;
        }
        .toggle-switch {
            display: flex;
            align-items: center;
            margin-top: 10px;
        }
        .toggle-switch label {
            margin-left: 10px;
            font-size: 14px;
        }

        /* Pop-up tutorial styles */
        #tutorial-popup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            max-width: 400px;
            text-align: center;
        }
        #tutorial-popup h2 {
            margin-top: 0;
        }
        #tutorial-popup p {
            margin: 10px 0;
        }
        #tutorial-popup button {
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            margin: 5px;
            transition: background-color 0.3s;
        }
        #tutorial-popup button:hover {
            background-color: #0056b3;
        }
        #tutorial-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999;
        }
    </style>
</head>
<body>
    <!-- Draggable scrolling words display -->
    <div id="word-display">Ready to read!</div>

    <!-- Text input field -->
    <textarea id="text-input" placeholder="Paste your script here..."></textarea>

    <!-- Buttons -->
    <div>
        <button id="go-button">Go</button>
        <button id="theme-toggle">Toggle Dark Mode</button>
    </div>

    <!-- Speed slider and labels -->
    <input type="range" id="speed-slider" min="50" max="500" value="200">
    <div id="speed-label">Speed: 200 WPM</div>
    <div id="progress-label">Progress: 0%</div>

    <!-- Toggle switches for pause modes -->
    <div class="toggle-switch">
        <input type="checkbox" id="pause-on-move-toggle">
        <label for="pause-on-move-toggle">Pause on Mouse Move</label>
    </div>
    <div class="toggle-switch">
        <input type="checkbox" id="pause-on-click-toggle" checked>
        <label for="pause-on-click-toggle">Pause on Click and Hold</label>
    </div>

    <!-- Pop-up tutorial -->
    <div id="tutorial-overlay"></div>
    <div id="tutorial-popup">
        <h2>Welcome to the Word-by-Word Script Reader!</h2>
        <p>Here's a quick guide to help you get started:</p>
        <div id="tutorial-step-1">
            <p><strong>Step 1:</strong> Paste your script into the text box and click "Go" to start reading.</p>
            <button id="tutorial-next">Next</button>
        </div>
        <div id="tutorial-step-2" style="display: none;">
            <p><strong>Step 2:</strong> Use the speed slider to adjust the reading speed in words per minute (WPM).</p>
            <button id="tutorial-next-2">Next</button>
        </div>
        <div id="tutorial-step-3" style="display: none;">
            <p><strong>Step 3:</strong> Toggle between pausing on mouse movement or click and hold using the switches below.</p>
            <button id="tutorial-next-3">Next</button>
        </div>
        <div id="tutorial-step-4" style="display: none;">
            <p><strong>Step 4:</strong> Press the <strong>space bar</strong> to <strong>start and stop</strong> the flow of words.</p>
            <button id="tutorial-next-4">Next</button>
        </div>
        <div id="tutorial-step-5" style="display: none;">
            <p><strong>Step 5:</strong> Drag the word display to move it anywhere on the screen.</p>
            <button id="tutorial-next-5">Next</button>
        </div>
        <div id="tutorial-step-6" style="display: none;">
            <p><strong>Step 6:</strong> Use the <strong>mouse wheel</strong> to <strong>rewind</strong> (scroll up) or <strong>fast forward</strong> (scroll down) through the words.</p>
            <button id="tutorial-close">Close</button>
        </div>
    </div>

    <script>
        let words = [];
        let currentIndex = 0;
        let intervalId = null;
        let isPaused = false;
        let isMouseMoving = false;
        let mouseMoveTimeout = null;
        let pauseOnMouseMove = false; // Default to pause on mouse move
        let pauseOnClick = true; // Default to pause on click and hold

        // Dragging functionality for the word display
        const wordDisplay = document.getElementById('word-display');
        let isDragging = false;
        let offsetX, offsetY;

        wordDisplay.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - wordDisplay.getBoundingClientRect().left;
            offsetY = e.clientY - wordDisplay.getBoundingClientRect().top;
            wordDisplay.style.cursor = 'grabbing'; // Change cursor to grabbing
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                wordDisplay.style.left = `${e.clientX - offsetX}px`;
                wordDisplay.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            wordDisplay.style.cursor = 'grab'; // Change cursor back to grab
        });

        // Function to start displaying words
        function startDisplay() {
            const text = document.getElementById('text-input').value.trim();
            if (!text) {
                alert("Please enter some text!");
                return;
            }
            words = text.split(/\s+/); // Split text into words
            currentIndex = 0;
            wordDisplay.textContent = words[currentIndex];
            updateProgress(); // Update progress
            const speed = getSpeed();
            clearInterval(intervalId); // Clear any existing interval
            intervalId = setInterval(showNextWord, speed);

            // Change the "Go" button to "Restart"
            const goButton = document.getElementById('go-button');
            goButton.textContent = "Restart";
            goButton.removeEventListener('click', startDisplay);
            goButton.addEventListener('click', restartDisplay);
        }

        // Function to restart the display
        function restartDisplay() {
            currentIndex = 0; // Reset to the first word
            wordDisplay.textContent = words[currentIndex];
            updateProgress(); // Update progress
            clearInterval(intervalId); // Clear the existing interval
            const speed = getSpeed();
            intervalId = setInterval(showNextWord, speed); // Restart the interval
        }

        // Function to show the next word
        function showNextWord() {
            if (isPaused || isMouseMoving) return; // Pause if mouse is held or moving
            currentIndex++;
            if (currentIndex >= words.length) {
                clearInterval(intervalId);
                wordDisplay.textContent = "Done!";
                updateProgress(); // Update progress when done
                return;
            }
            wordDisplay.textContent = words[currentIndex];
            updateProgress(); // Update progress after each word
        }

        // Function to rewind or skip ahead based on mouse scroll
        function handleScroll(event) {
            if (event.deltaY < 0) {
                // Scroll up: rewind
                currentIndex = Math.max(currentIndex - 1, 0); // Go back one word
            } else if (event.deltaY > 0) {
                // Scroll down: skip ahead
                currentIndex = Math.min(currentIndex + 1, words.length - 1); // Go forward one word
            }
            wordDisplay.textContent = words[currentIndex];
            updateProgress(); // Update progress
        }

        // Function to calculate speed in milliseconds per word based on WPM
        function getSpeed() {
            const slider = document.getElementById('speed-slider');
            const wpm = parseInt(slider.value);
            const msPerWord = (60 / wpm) * 1000; // Convert WPM to milliseconds per word
            return msPerWord;
        }

        // Function to update the speed label with WPM
        function updateSpeedLabel() {
            const wpm = parseInt(document.getElementById('speed-slider').value);
            document.getElementById('speed-label').textContent = `Speed: ${wpm} WPM`;
        }

        // Function to update the progress label
        function updateProgress() {
            const progress = ((currentIndex + 1) / words.length) * 100;
            document.getElementById('progress-label').textContent = `Progress: ${Math.round(progress)}%`;
        }

        // Event listener for the "Go" button
        document.getElementById('go-button').addEventListener('click', startDisplay);

        // Event listener for the speed slider
        document.getElementById('speed-slider').addEventListener('input', function() {
            updateSpeedLabel(); // Update the WPM label
            const speed = getSpeed(); // Recalculate speed in milliseconds
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = setInterval(showNextWord, speed);
            }
        });

        // Event listener for the theme toggle button
        document.getElementById('theme-toggle').addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
        });

        // Event listener for the pause on mouse move toggle
        document.getElementById('pause-on-move-toggle').addEventListener('change', function() {
            pauseOnMouseMove = this.checked; // Update pause mode based on toggle state
        });

        // Event listener for the pause on click toggle
        document.getElementById('pause-on-click-toggle').addEventListener('change', function() {
            pauseOnClick = this.checked; // Update pause mode based on toggle state
        });

        // Pause functionality on mouse hold (if pauseOnClick is true)
        document.addEventListener('mousedown', () => {
            if (pauseOnClick) {
                isPaused = true;
            }
        });
        document.addEventListener('mouseup', () => {
            if (pauseOnClick) {
                isPaused = false;
            }
        });

        // Pause functionality on mouse movement (if pauseOnMouseMove is true)
        document.addEventListener('mousemove', () => {
            if (pauseOnMouseMove) {
                isMouseMoving = true; // Pause when mouse is moving
                clearTimeout(mouseMoveTimeout); // Clear any existing timeout
                mouseMoveTimeout = setTimeout(() => {
                    isMouseMoving = false; // Resume after a short delay
                }, 50); // Resume 50ms after mouse stops moving
            }
        });

        // Start/stop functionality on space bar keydown
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault(); // Prevent default space bar behavior (scrolling)
                if (intervalId) {
                    clearInterval(intervalId); // Stop the flow
                    intervalId = null;
                } else {
                    const speed = getSpeed();
                    intervalId = setInterval(showNextWord, speed); // Start the flow
                }
            }
        });

        // Scroll functionality to rewind or skip ahead
        document.addEventListener('wheel', handleScroll);

        // Initialize the speed label
        updateSpeedLabel();

        // Tutorial functionality
        const tutorialPopup = document.getElementById('tutorial-popup');
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        const tutorialSteps = [
            document.getElementById('tutorial-step-1'),
            document.getElementById('tutorial-step-2'),
            document.getElementById('tutorial-step-3'),
            document.getElementById('tutorial-step-4'),
            document.getElementById('tutorial-step-5'),
            document.getElementById('tutorial-step-6')
        ];
        let currentStep = 0;

        // Show the first step
        tutorialSteps[currentStep].style.display = 'block';

        // Event listener for the "Next" button
        document.getElementById('tutorial-next').addEventListener('click', () => {
            tutorialSteps[currentStep].style.display = 'none';
            currentStep++;
            tutorialSteps[currentStep].style.display = 'block';
        });

        document.getElementById('tutorial-next-2').addEventListener('click', () => {
            tutorialSteps[currentStep].style.display = 'none';
            currentStep++;
            tutorialSteps[currentStep].style.display = 'block';
        });

        document.getElementById('tutorial-next-3').addEventListener('click', () => {
            tutorialSteps[currentStep].style.display = 'none';
            currentStep++;
            tutorialSteps[currentStep].style.display = 'block';
        });

        document.getElementById('tutorial-next-4').addEventListener('click', () => {
            tutorialSteps[currentStep].style.display = 'none';
            currentStep++;
            tutorialSteps[currentStep].style.display = 'block';
        });

        document.getElementById('tutorial-next-5').addEventListener('click', () => {
            tutorialSteps[currentStep].style.display = 'none';
            currentStep++;
            tutorialSteps[currentStep].style.display = 'block';
        });

        // Event listener for the "Close" button
        document.getElementById('tutorial-close').addEventListener('click', () => {
            tutorialPopup.style.display = 'none';
            tutorialOverlay.style.display = 'none';
        });
    </script>
</body>
</html>
