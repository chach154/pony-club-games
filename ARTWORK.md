# Иллюстрация и игровые материалы

Главная иллюстрация создана встроенным инструментом **ImageGen** для этого проекта. CLI/API fallback не использовался. Оригинал сохранён в `assets/equestria-hero.png`, оптимизированная версия для страницы — в `assets/equestria-hero.webp` (1942 × 809 пикселей).

Финальный промпт:

> Use case: illustration-story. Asset type: wide hero illustration for a Russian My Little Pony fan browser game collection named Pony Club. Create a polished charming storybook panorama of Equestria with recognizable Friendship Is Magic ponies Twilight Sparkle, Rainbow Dash, Pinkie Pie, Fluttershy, Applejack and Rarity happily together in a meadow. Soft hand-painted 2D cartoon with fine clean outlines, warm luminous highlights and delicate texture, expressive large friendly eyes. Scene: pastel lavender and blue hills, pink flowering trees, tiny whimsical Ponyville cottages, distant fairytale castle, soft rainbow, white fluffy clouds, flowers and little stars. Composition: landscape panoramic wide aspect ratio, characters grouped in the right two-thirds and lower center, spacious light pale lavender sky on left for website headline overlay; landscape fills frame edge to edge. Gentle lavender, blush pink, butter yellow, mint and sky blue. Premium cozy children's picture book feeling. No text, letters, UI, border, watermark or logos.

Игровые обложки, портреты и персонаж аркады созданы в SVG в `art.js`; фон и эффекты игр рисуются через Canvas 2D. Четвёртая игра использует тот же SVG-портрет Рарити; магические снаряды и монстрики нарисованы в `horn.js` через Canvas 2D. Автор заменил внешний вид рога своей картинкой `assets/horn.png`; она изгибается и выпрямляется при отрисовке, исходный файл не меняется. Дополнительная генерация изображений для этой игры не использовалась. Музыка ритм-игры — короткая последовательность нот, синтезируемая в браузере. Оригинальные изображения, музыка и файлы из сериала не загружались.

My Little Pony и персонажи принадлежат Hasbro. Генерация фан-иллюстрации не передаёт прав на персонажей или торговые марки.
