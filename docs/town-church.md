# Town church and funeral

The village gate now has moment-specific, optional single-box conversations for Hale, Mira, Tam, and Irvolino. The conversations change after Hakon dies; exhausted conversations never fall back to rescue dialogue.

A new 700 x 420 painted church stands directly behind Hakon. Its carved portal, rose window, bell tower, royal banners, and warm interior establish where he sheltered the townspeople. All three farewell paintings now use the church entrance. Original paintings are retained alongside the new assets.

After the final farewell, Hale and Irvolino lift the king onto a bier and carry him into the entrance. Rescued Mira and Tam follow. The original villagers remain the same story objects and cannot respawn outside. The companions wait until the procession finishes; the level exit then opens.

Art: assets/env/village/town-church.png; assets/npcs/church-bearers.png; assets/cinematics/church-hakon-*.png. Four carrying poses are imported through the existing sprite pipeline. Review image: church-art-review.png.

Validation: all 17 game test scripts passed, including moment-specific dialogue, repeat prevention, smooth procession movement, exit gating, and permanent entry into the church. Native canvas asset review passed. No live gameplay playthrough was performed.
