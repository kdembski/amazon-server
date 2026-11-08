export class DiscordFormatter {
  // Discord collapses plain spaces, so they are kept apart by invisible left-to-right marks
  static spacing(width: number) {
    return new Array(width).fill("‎").join(" ");
  }
}
