# Writes the page files of the BPSC interview section that come from data: one page per bank and one per question,
# in English and Urdu (FR-7, FR-12, FR-31). They go into _bpsc/, which git ignores, and Jekyll builds them (as the
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
    page("#{lang}-#{slug}.html", fm, "{% include i18n.html %}{% include pages/bpsc-bank.html %}")
    items.each_with_index do |it, n|
      near = lambda { |x| x && { "id" => x["id"], "question" => x["question"], "question_ur" => x["question_ur"] }.compact }
      q = ur && it["question_ur"] ? it["question_ur"] : it["question"]
      a = ur && it["answer_ur"] ? it["answer_ur"] : (it["short_answer"] || it["answer"])
      fm = {
        "layout" => "default", "bpsc" => true, "bank" => slug, "qid" => it["id"],
        # The item itself and its neighbours, so the page doesn't have to search the banks (much faster builds).
        "item" => it.transform_values { |v| v.is_a?(Date) ? v.to_s : v },
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
