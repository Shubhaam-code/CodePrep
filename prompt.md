Task: Implement Roadmap Pattern GitHub Sync (Phase 7.1)

Goal:

Whenever a solved question belongs to the DSA Roadmap, save it inside the DSA Pattern Repository using the roadmap pattern as the folder.

Rules:

1. Do NOT modify frontend.

2. Do NOT modify Chrome Extension.

3. Keep existing GitHub authentication.

4. Keep existing submission flow.

5. Keep Company repository flow unchanged.

6. Keep GV Challenge repository flow unchanged.

7. Use existing roadmapPattern field already stored on Question documents.

Workflow:

Submission Accepted

↓

Load Question

↓

If roadmapPattern exists:

Use DSA Pattern Repository.

If repository does not exist:

Create it.

Folder name:

roadmapPattern

Example:

fast-and-slow-pointer

sliding-window

dynamic-programming

trees

graphs

etc.

If folder does not exist:

Create folder automatically.

Store solution inside:

<roadmapPattern>/<Question Title>.<extension>

Examples:

fast-and-slow-pointer/Linked List Cycle II.py

trees/Balanced Binary Tree.cpp

dynamic-programming/Coin Change.java

Do NOT create nested folders.

Do NOT change filename format except existing language extension logic.

If roadmapPattern is null:

Keep existing Company/GV logic unchanged.

Reuse existing GitHub upload service.

Return only modified backend files.