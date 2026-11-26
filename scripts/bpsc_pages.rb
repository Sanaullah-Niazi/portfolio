# Writes the page files of the BPSC interview section that come from data: one page per bank, one per numbered
# category (the A1 to G88 sections, /bpsc-interview/<bank>/<category>/), and one per question, in English and Urdu
# (FR-7, FR-12, FR-31). Questions in a numbered category are read on their category page, so their question
# address (/bpsc-interview/q/<id>/) is only a tiny redirect there: thousands of full pages made the build too slow. They go into _bpsc/, which git ignores, and Jekyll builds them (as the
# "bpsc" collection in _config.yml) at the addresses in their permalinks (/bpsc-interview/<bank>/, /bpsc-interview/q/<id>/ and the same under /ur/).
# The pages hold only front matter; the text comes from _data/bpsc/ through _includes/pages/bpsc-*.html.
#
# Run it before every build:   ruby scripts/bpsc_pages.rb && bundle exec jekyll build
# The deploy workflow does this. With --drafts it also writes pages for draft items, for a local preview with
#   bundle exec jekyll serve --config _config.yml,_config_bpsc_drafts.yml
# Ruby only (no gems), because GitHub Pages' Jekyll does not run plugins. A collection rather than pages, so the
# site-wide page lookups (lang-urls.html, breadcrumbs-ld.html) don't slow down with thousands of questions.
require "yaml"
require "date"
require "fileutils"

ROOT = File.expand_path("..", __dir__)
OUT = File.join(ROOT, "_bpsc")
drafts = ARGV.include?("--drafts")

def load(path)
  YAML.safe_load(File.read(path), permitted_classes: [Date]) || []
end

def clip(text, max)
  t = text.to_s.gsub(/[*_`#>\[\]]/, "").gsub(/\(https?:[^)]*\)/, "").gsub(/\s+/, " ").strip
  t.length > max ? t[0, max - 1].sub(/\s+\S*\z/, "") + "…" : t
end

def page(file, data, body)
  File.write(File.join(OUT, file), data.to_yaml + "---\n" + body + "\n")
end

# A numbered category looks like "A1 · Computer fundamentals"; its address is the slug of the whole name.
CODED = /\A[A-G]\d+ · /
def slug(s)
  s.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-\z/, "")
end
def plain(it)
  it.transform_values { |v| v.is_a?(Date) ? v.to_s : v }
end

FileUtils.rm_rf(OUT)
FileUtils.mkdir_p(OUT)

banks = load(File.join(ROOT, "_data/bpsc/banks.yml"))
count = 0
banks.each do |b|
  slug = b["slug"]
  items = load(File.join(ROOT, "_data/bpsc/#{slug}.yml"))
  items = items.select { |i| i["status"] == "published" } unless drafts
  { "en" => "", "ur" => "/ur" }.each do |lang, pre|
    ur = lang == "ur"
    name = ur ? b["name_ur"] : b["name"]
    fm = {
      "layout" => "default", "bpsc" => true, "bank" => slug,
      "permalink" => "#{pre}/bpsc-interview/#{slug}/",
      "title" => ur ? "#{name}: بی پی ایس سی انٹرویو کے سوالات اور جوابات" : "#{name} questions and answers for the BPSC interview",
      "description" => clip(ur ? b["blurb_ur"] : b["blurb"], 160),
      "scripts" => ["/assets/js/bpsc.js"],
      "image" => { "path" => "/assets/img/bpsc-card.jpg", "width" => 1200, "height" => 630, "alt" => "BPSC IT Teacher Interview Prep" },
    }
    fm.merge!("lang" => "ur", "locale" => "ur_PK") if ur
    coded = b["categories"].select { |c| c =~ CODED }.map { |c| [c, items.select { |i| i["category"] == c }] }.reject { |_, l| l.empty? }
    fm["sections"] = coded.map { |c, l| { "name" => c, "slug" => slug(c), "count" => l.size } }
    page("#{lang}-#{slug}.html", fm, "{% include i18n.html %}{% include pages/bpsc-bank.html %}")
    coded.each_with_index do |(c, l), n|
      code, title = c.split(" · ", 2)
      cfm = {
        "layout" => "default", "bpsc" => true, "bank" => slug, "bank_name" => name,
        "section" => c, "section_code" => code, "section_title" => title,
        "items" => l.map { |it| plain(it) },
        "s_prev" => n > 0 ? { "name" => coded[n - 1][0], "slug" => slug(coded[n - 1][0]) } : nil,
        "s_next" => coded[n + 1] ? { "name" => coded[n + 1][0], "slug" => slug(coded[n + 1][0]) } : nil,
        "permalink" => "#{pre}/bpsc-interview/#{slug}/#{slug(c)}/",
        "title" => ur ? "#{title}: بی پی ایس سی آئی ٹی ٹیچر انٹرویو کے #{l.size} سوالات" : "#{title}: #{l.size} BPSC IT Teacher viva questions and answers",
        "description" => clip("#{l.size} numbered questions with short answers, from basic to hard: " + l.first(4).map { |i| i["question"] }.join(" "), 160),
        "scripts" => ["/assets/js/bpsc.js"],
        "image" => { "path" => "/assets/img/bpsc-card.jpg", "width" => 1200, "height" => 630, "alt" => "BPSC IT Teacher Interview Prep" },
      }
      cfm.merge!("lang" => "ur", "locale" => "ur_PK") if ur
      page("#{lang}-c-#{slug(c)}.html", cfm, "{% include i18n.html %}{% include pages/bpsc-category.html %}")
    end
    items.each_with_index do |it, n|
      if it["category"].to_s =~ CODED
        to = "#{pre}/bpsc-interview/#{slug}/#{slug(it["category"])}/##{it["id"]}"
        page("#{lang}-q-#{it["id"]}.html", { "layout" => "bpsc-redirect", "sitemap" => false, "to" => to, "permalink" => "#{pre}/bpsc-interview/q/#{it["id"]}/" }, "")
        count += 1 if lang == "en"
        next
      end
      near = lambda { |x| x && { "id" => x["id"], "question" => x["question"], "question_ur" => x["question_ur"] }.compact }
      q = ur && it["question_ur"] ? it["question_ur"] : it["question"]
      a = ur && it["answer_ur"] ? it["answer_ur"] : (it["short_answer"] || it["answer"])
      fm = {
        "layout" => "default", "bpsc" => true, "bank" => slug, "qid" => it["id"],
        # The item itself and its neighbours, so the page doesn't have to search the banks (much faster builds).
        "item" => plain(it),
        "bank_name" => ur ? b["name_ur"] : b["name"],
        "q_prev" => n > 0 ? near.call(items[n - 1]) : nil, "q_next" => near.call(items[n + 1]),
        "permalink" => "#{pre}/bpsc-interview/q/#{it["id"]}/",
        "title" => clip(q, 90), "description" => clip(a, 160).empty? ? (ur ? "#{b["name_ur"]}: بی پی ایس سی آئی ٹی ٹیچر انٹرویو کی تیاری کا سوال۔" : "A #{b["name"]} question from the BPSC IT Teacher interview, with tips to prepare it.") : clip(a, 160),
        "last_modified_at" => it["verified_on"],
        "scripts" => ["/assets/js/bpsc.js"],
        "image" => { "path" => "/assets/img/bpsc-card.jpg", "width" => 1200, "height" => 630, "alt" => "BPSC IT Teacher Interview Prep" },
      }
      fm.merge!("lang" => "ur", "locale" => "ur_PK") if ur
      page("#{lang}-q-#{it["id"]}.html", fm, "{% include i18n.html %}{% include pages/bpsc-question.html %}")
      count += 1 if lang == "en"
    end
  end
end
puts "BPSC: wrote #{banks.size} bank pages and #{count} question pages per language#{drafts ? " (drafts included)" : ""}."
